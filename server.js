const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = 'kasa-sistemi-secret-key-2024';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Veritabanı bağlantısı
const db = new sqlite3.Database('./kasa_sistemi.db', (err) => {
  if (err) {
    console.error('Veritabanı bağlantı hatası:', err.message);
  } else {
    console.log('SQLite veritabanına bağlandı.');
    initDatabase();
  }
});

// Veritabanı tablolarını oluştur
function initDatabase() {
  // Kullanıcılar tablosu
  db.run(`CREATE TABLE IF NOT EXISTS kullanicilar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_adi TEXT UNIQUE NOT NULL,
    sifre TEXT NOT NULL,
    rol TEXT DEFAULT 'kasiyer',
    olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, function(err) {
    if (err) {
      console.error('Kullanıcılar tablosu oluşturma hatası:', err);
      return;
    }
    console.log('Kullanıcılar tablosu oluşturuldu.');
    
    // Varsayılan admin kullanıcısı ekle
    const adminPassword = bcrypt.hashSync('1234', 10);
    db.run(`INSERT OR IGNORE INTO kullanicilar (kullanici_adi, sifre, rol) VALUES (?, ?, ?)`, 
      ['admin', adminPassword, 'admin'], function(err) {
        if (err) {
          console.error('Admin kullanıcısı ekleme hatası:', err);
        } else {
          console.log('Admin kullanıcısı eklendi.');
        }
      });

    // Varsayılan kasiyer kullanıcısı ekle
    const kasiyerPassword = bcrypt.hashSync('0000', 10);
    db.run(`INSERT OR IGNORE INTO kullanicilar (kullanici_adi, sifre, rol) VALUES (?, ?, ?)`, 
      ['kasiyer', kasiyerPassword, 'kasiyer'], function(err) {
        if (err) {
          console.error('Kasiyer kullanıcısı ekleme hatası:', err);
        } else {
          console.log('Kasiyer kullanıcısı eklendi.');
        }
      });
  });

  // Ürünler tablosu
  db.run(`CREATE TABLE IF NOT EXISTS urunler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barkod TEXT UNIQUE NOT NULL,
    aciklama TEXT NOT NULL,
    fiyat REAL NOT NULL,
    alis_fiyati REAL DEFAULT 0,
    stok_miktari INTEGER DEFAULT 0,
    birim TEXT DEFAULT 'Adet',
    tip TEXT DEFAULT 'A',
    kategori TEXT DEFAULT '',
    kdv REAL DEFAULT 0,
    olusturma_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, function(err) {
    if (err) {
      console.error('Ürünler tablosu oluşturma hatası:', err);
      return;
    }
    console.log('Ürünler tablosu oluşturuldu.');
    
    // Kategori ve kdv alanları yoksa ekle (migration)
    db.all("PRAGMA table_info(urunler)", (err, columns) => {
      if (err) return;
      const columnNames = columns.map(c => c.name);
      if (!columnNames.includes('kategori')) {
        db.run('ALTER TABLE urunler ADD COLUMN kategori TEXT DEFAULT ""');
      }
      if (!columnNames.includes('kdv')) {
        db.run('ALTER TABLE urunler ADD COLUMN kdv REAL DEFAULT 0');
      }
    });

    // Örnek ürünler ekle
    db.run(`INSERT OR IGNORE INTO urunler (barkod, aciklama, fiyat, alis_fiyati, stok_miktari) VALUES (?, ?, ?, ?, ?)`, 
      ['12345', 'Süt 1L', 15.00, 12.00, 50], function(err) {
        if (err) {
          console.error('Süt ürünü ekleme hatası:', err);
        } else {
          console.log('Süt ürünü eklendi.');
        }
      });
      
    db.run(`INSERT OR IGNORE INTO urunler (barkod, aciklama, fiyat, alis_fiyati, stok_miktari) VALUES (?, ?, ?, ?, ?)`, 
      ['67890', 'Ekmek', 7.00, 5.00, 100], function(err) {
        if (err) {
          console.error('Ekmek ürünü ekleme hatası:', err);
        } else {
          console.log('Ekmek ürünü eklendi.');
        }
      });
  });

  // Satışlar tablosu
  db.run(`CREATE TABLE IF NOT EXISTS satislar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    toplam_tutar REAL NOT NULL,
    cesit_sayisi INTEGER NOT NULL,
    kullanici_id INTEGER,
    satis_tarihi DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kullanici_id) REFERENCES kullanicilar (id)
  )`, function(err) {
    if (err) {
      console.error('Satışlar tablosu oluşturma hatası:', err);
    } else {
      console.log('Satışlar tablosu oluşturuldu.');
    }
  });

  // Satış detayları tablosu
  db.run(`CREATE TABLE IF NOT EXISTS satis_detaylari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    satis_id INTEGER,
    urun_id INTEGER,
    adet INTEGER NOT NULL,
    birim_fiyat REAL NOT NULL,
    toplam_fiyat REAL NOT NULL,
    FOREIGN KEY (satis_id) REFERENCES satislar (id),
    FOREIGN KEY (urun_id) REFERENCES urunler (id)
  )`, function(err) {
    if (err) {
      console.error('Satış detayları tablosu oluşturma hatası:', err);
    } else {
      console.log('Satış detayları tablosu oluşturuldu.');
    }
  });
}

// JWT token doğrulama middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token gerekli' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Geçersiz token' });
    }
    req.user = user;
    next();
  });
}

// Kullanıcı girişi
app.post('/api/login', (req, res) => {
  const { kullanici_adi, sifre } = req.body;

  db.get('SELECT * FROM kullanicilar WHERE kullanici_adi = ?', [kullanici_adi], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
    }

    const validPassword = bcrypt.compareSync(sifre, user.sifre);
    if (!validPassword) {
      return res.status(401).json({ error: 'Yanlış şifre' });
    }

    const token = jwt.sign(
      { id: user.id, kullanici_adi: user.kullanici_adi, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        kullanici_adi: user.kullanici_adi,
        rol: user.rol
      }
    });
  });
});

// Şifremi unuttum - Kullanıcı adı kontrolü
app.post('/api/forgot-password', (req, res) => {
  const { kullanici_adi } = req.body;

  if (!kullanici_adi) {
    return res.status(400).json({ error: 'Kullanıcı adı gerekli' });
  }

  db.get('SELECT * FROM kullanicilar WHERE kullanici_adi = ?', [kullanici_adi], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Varsayılan şifreye sıfırla (güvenlik için)
    const yeniSifre = '1234'; // Varsayılan şifre
    const hashedPassword = bcrypt.hashSync(yeniSifre, 10);

    db.run('UPDATE kullanicilar SET sifre = ? WHERE kullanici_adi = ?', 
      [hashedPassword, kullanici_adi], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Şifre güncellenirken hata oluştu' });
        }

        res.json({ 
          message: 'Şifreniz başarıyla sıfırlandı',
          yeniSifre: yeniSifre,
          note: 'Güvenlik için giriş yaptıktan sonra şifrenizi değiştirmeyi unutmayın!'
        });
      });
  });
});

// Şifre değiştirme (giriş yapmış kullanıcı için)
app.post('/api/change-password', authenticateToken, (req, res) => {
  const { eski_sifre, yeni_sifre } = req.body;
  const kullanici_id = req.user.id;

  if (!eski_sifre || !yeni_sifre) {
    return res.status(400).json({ error: 'Eski ve yeni şifre gerekli' });
  }

  db.get('SELECT * FROM kullanicilar WHERE id = ?', [kullanici_id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası' });
    }

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const validPassword = bcrypt.compareSync(eski_sifre, user.sifre);
    if (!validPassword) {
      return res.status(401).json({ error: 'Mevcut şifre yanlış' });
    }

    const hashedNewPassword = bcrypt.hashSync(yeni_sifre, 10);

    db.run('UPDATE kullanicilar SET sifre = ? WHERE id = ?', 
      [hashedNewPassword, kullanici_id], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Şifre güncellenirken hata oluştu' });
        }

        res.json({ message: 'Şifreniz başarıyla değiştirildi' });
      });
  });
});

// Ürün API'leri
app.get('/api/urun', (req, res) => {
  db.all('SELECT * FROM urunler ORDER BY aciklama', (err, urunler) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası' });
    }
    res.json(urunler);
  });
});

app.get('/api/urun/:barkod', (req, res) => {
  const { barkod } = req.params;
  
  db.get('SELECT * FROM urunler WHERE barkod = ?', [barkod], (err, urun) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası' });
    }
    
    if (!urun) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    
    res.json(urun);
  });
});

app.post('/api/urun', authenticateToken, (req, res) => {
  const { barkod, aciklama, fiyat, alis_fiyati, stok_miktari, birim, tip } = req.body;

  db.run(
    'INSERT INTO urunler (barkod, aciklama, fiyat, alis_fiyati, stok_miktari, birim, tip) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [barkod, aciklama, fiyat, alis_fiyati || 0, stok_miktari || 0, birim || 'Adet', tip || 'A'],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Bu barkod zaten mevcut' });
        }
        return res.status(500).json({ error: 'Veritabanı hatası' });
      }
      
      res.json({ 
        id: this.lastID, 
        message: 'Ürün başarıyla eklendi' 
      });
    }
  );
});

app.put('/api/urun/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { barkod, aciklama, fiyat, alis_fiyati, stok_miktari, birim, tip, kategori, kdv } = req.body;

  db.run(
    'UPDATE urunler SET barkod = ?, aciklama = ?, fiyat = ?, alis_fiyati = ?, stok_miktari = ?, birim = ?, tip = ?, kategori = ?, kdv = ? WHERE id = ?',
    [barkod, aciklama, fiyat, alis_fiyati, stok_miktari, birim, tip, kategori, kdv, id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Bu barkod başka bir üründe zaten mevcut' });
        }
        return res.status(500).json({ error: 'Veritabanı hatası' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Ürün bulunamadı' });
      }
      res.json({ message: 'Ürün başarıyla güncellendi' });
    }
  );
});

app.delete('/api/urun/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM urunler WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }
    
    res.json({ message: 'Ürün başarıyla silindi' });
  });
});

// Kullanıcı API'leri
app.get('/api/kullanici', authenticateToken, (req, res) => {
  db.all('SELECT id, kullanici_adi, rol, olusturma_tarihi FROM kullanicilar ORDER BY kullanici_adi', (err, kullanicilar) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası' });
    }
    res.json(kullanicilar);
  });
});

app.post('/api/kullanici', authenticateToken, (req, res) => {
  const { kullanici_adi, sifre, rol } = req.body;
  const hashedPassword = bcrypt.hashSync(sifre, 10);

  db.run(
    'INSERT INTO kullanicilar (kullanici_adi, sifre, rol) VALUES (?, ?, ?)',
    [kullanici_adi, hashedPassword, rol || 'kasiyer'],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Bu kullanıcı adı zaten mevcut' });
        }
        return res.status(500).json({ error: 'Veritabanı hatası' });
      }
      
      res.json({ 
        id: this.lastID, 
        message: 'Kullanıcı başarıyla eklendi' 
      });
    }
  );
});

// Satış API'leri
app.post('/api/satis', authenticateToken, (req, res) => {
  const { toplam_tutar, cesit_sayisi, urunler } = req.body;
  const kullanici_id = req.user.id;

  db.run(
    'INSERT INTO satislar (toplam_tutar, cesit_sayisi, kullanici_id) VALUES (?, ?, ?)',
    [toplam_tutar, cesit_sayisi, kullanici_id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Veritabanı hatası' });
      }

      const satis_id = this.lastID;

      // Satış detaylarını ekle
      const stmt = db.prepare('INSERT INTO satis_detaylari (satis_id, urun_id, adet, birim_fiyat, toplam_fiyat) VALUES (?, ?, ?, ?, ?)');
      
      urunler.forEach(urun => {
        stmt.run([satis_id, urun.id, urun.adet, urun.fiyat, urun.fiyat * urun.adet]);
      });
      
      stmt.finalize((err) => {
        if (err) {
          return res.status(500).json({ error: 'Satış detayları kaydedilemedi' });
        }
        
        res.json({ 
          satis_id, 
          message: 'Satış başarıyla kaydedildi' 
        });
      });
    }
  );
});

app.get('/api/satis', authenticateToken, (req, res) => {
  const query = `
    SELECT s.*, k.kullanici_adi 
    FROM satislar s 
    LEFT JOIN kullanicilar k ON s.kullanici_id = k.id 
    ORDER BY s.satis_tarihi DESC
  `;
  
  db.all(query, (err, satislar) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası' });
    }
    res.json(satislar);
  });
});

// Haftalık ve aylık ciro özeti API'si
app.get('/api/ciro-ozet', authenticateToken, async (req, res) => {
  try {
    // Haftalık ve aylık tarih aralıkları
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Pazar
    startOfWeek.setHours(0,0,0,0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Satışlar (tarih ve toplam_tutar)
    const satislar = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM satislar', (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    // Satış detayları (satış id, ürün id, adet, birim fiyat)
    const satisDetaylari = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM satis_detaylari', (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    // Ürünler (id, alis_fiyati)
    const urunler = await new Promise((resolve, reject) => {
      db.all('SELECT id, alis_fiyati FROM urunler', (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    // Yardımcı: ürün id -> alış fiyatı
    const urunAlisFiyat = {};
    urunler.forEach(u => { urunAlisFiyat[u.id] = u.alis_fiyati || 0; });

    // Satışları haftalık ve aylık olarak filtrele
    function isInWeek(dateStr) {
      const d = new Date(dateStr);
      return d >= startOfWeek && d <= now;
    }
    function isInMonth(dateStr) {
      const d = new Date(dateStr);
      return d >= startOfMonth && d <= now;
    }
    // Toplam satış
    let haftalikSatis = 0, aylikSatis = 0;
    satislar.forEach(s => {
      if (isInWeek(s.satis_tarihi)) haftalikSatis += s.toplam_tutar || 0;
      if (isInMonth(s.satis_tarihi)) aylikSatis += s.toplam_tutar || 0;
    });
    // Toplam alış maliyeti (satış detaylarından)
    let haftalikAlis = 0, aylikAlis = 0;
    satisDetaylari.forEach(detay => {
      const satis = satislar.find(s => s.id === detay.satis_id);
      if (!satis) return;
      const alisFiyat = urunAlisFiyat[detay.urun_id] || 0;
      const toplamAlis = alisFiyat * detay.adet;
      if (isInWeek(satis.satis_tarihi)) haftalikAlis += toplamAlis;
      if (isInMonth(satis.satis_tarihi)) aylikAlis += toplamAlis;
    });
    res.json({
      haftalik: {
        satis: haftalikSatis,
        alis: haftalikAlis,
        ciro: haftalikSatis - haftalikAlis
      },
      aylik: {
        satis: aylikSatis,
        alis: aylikAlis,
        ciro: aylikSatis - aylikAlis
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Ciro özeti hesaplanamadı', detail: err.message });
  }
});

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Server başlat
app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
  console.log(`API: http://localhost:${PORT}/api`);
}); 