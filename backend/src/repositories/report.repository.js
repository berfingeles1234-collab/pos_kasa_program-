const { BaseRepository } = require('./base.repository');

const TZ = 'Europe/Istanbul';

class ReportRepository extends BaseRepository {
  _appendStoreFilter(conditions, params, paramIndex, tenant, filters) {
    if (!filters.allStores && filters.storeId) {
      conditions.push(`s.store_id = $${paramIndex}`);
      params.push(filters.storeId);
      return paramIndex + 1;
    }
    return paramIndex;
  }

  _appendDateFilters(conditions, params, paramIndex, filters) {
    if (filters.startDateStr) {
      conditions.push(
        `(s.sold_at AT TIME ZONE '${TZ}')::date >= $${paramIndex}::date`
      );
      params.push(filters.startDateStr);
      paramIndex += 1;
    }

    if (filters.endDateStr) {
      conditions.push(
        `(s.sold_at AT TIME ZONE '${TZ}')::date <= $${paramIndex}::date`
      );
      params.push(filters.endDateStr);
      paramIndex += 1;
    }

    return paramIndex;
  }

  _saleMetricsCte(whereClause) {
    return `
      WITH sale_metrics AS (
        SELECT
          s.id,
          s.store_id,
          s.user_id,
          s.receipt_no,
          s.total_amount,
          s.sold_at,
          s.invoice_mode,
          (s.sold_at AT TIME ZONE '${TZ}')::date AS sale_date,
          COALESCE(SUM(
            COALESCE(si.purchase_price, p.purchase_price, 0) * si.quantity
          ), 0) AS total_cost
        FROM sales s
        INNER JOIN sale_items si ON si.sale_id = s.id
        LEFT JOIN products p ON p.id = si.product_id
        WHERE ${whereClause}
        GROUP BY s.id, s.store_id, s.user_id, s.receipt_no, s.total_amount, s.sold_at, s.invoice_mode
      )
    `;
  }

  _mapAggregateRow(row) {
    const totalRevenue = Number(row.total_revenue || 0);
    const totalCost = Number(row.total_cost || 0);
    const totalProfit = Number(row.total_profit ?? totalRevenue - totalCost);

    return {
      sale_count: Number(row.sale_count || 0),
      total_revenue: totalRevenue,
      total_cost: totalCost,
      total_profit: totalProfit,
      average_basket: Number(row.average_basket || 0),
    };
  }

  async getProfitSummary(tenant, filters) {
    this.setTenant(tenant).requireTenant();

    const conditions = ['s.customer_id = $1', "s.status = 'completed'"];
    const params = [tenant.customerId];
    let paramIndex = 2;

    paramIndex = this._appendStoreFilter(conditions, params, paramIndex, tenant, filters);
    paramIndex = this._appendDateFilters(conditions, params, paramIndex, filters);

    const whereClause = conditions.join(' AND ');
    const cte = this._saleMetricsCte(whereClause);

    const result = await this.query(
      `
        ${cte}
        SELECT
          COUNT(*)::int AS sale_count,
          COALESCE(SUM(total_amount), 0) AS total_revenue,
          COALESCE(SUM(total_cost), 0) AS total_cost,
          COALESCE(SUM(total_amount - total_cost), 0) AS total_profit,
          COALESCE(AVG(total_amount), 0) AS average_basket
        FROM sale_metrics
      `,
      params
    );

    return this._mapAggregateRow(result.rows[0] || {});
  }

  async getDailyProfitSummary(tenant, filters) {
    this.setTenant(tenant).requireTenant();

    const conditions = ['s.customer_id = $1', "s.status = 'completed'"];
    const params = [tenant.customerId];
    let paramIndex = 2;

    paramIndex = this._appendStoreFilter(conditions, params, paramIndex, tenant, filters);
    paramIndex = this._appendDateFilters(conditions, params, paramIndex, filters);

    const whereClause = conditions.join(' AND ');
    const cte = this._saleMetricsCte(whereClause);

    const result = await this.query(
      `
        ${cte}
        SELECT
          sale_date AS date,
          COUNT(*)::int AS sale_count,
          COALESCE(SUM(total_amount), 0) AS total_revenue,
          COALESCE(SUM(total_cost), 0) AS total_cost,
          COALESCE(SUM(total_amount - total_cost), 0) AS total_profit,
          COALESCE(AVG(total_amount), 0) AS average_basket
        FROM sale_metrics
        GROUP BY sale_date
        ORDER BY sale_date DESC
      `,
      params
    );

    return result.rows.map((row) => ({
      date: row.date,
      ...this._mapAggregateRow(row),
    }));
  }

  async getSalesWithProfit(tenant, filters) {
    this.setTenant(tenant).requireTenant();

    const conditions = ['s.customer_id = $1', "s.status = 'completed'"];
    const params = [tenant.customerId];
    let paramIndex = 2;

    paramIndex = this._appendStoreFilter(conditions, params, paramIndex, tenant, filters);
    paramIndex = this._appendDateFilters(conditions, params, paramIndex, filters);

    const whereClause = conditions.join(' AND ');
    const cte = this._saleMetricsCte(whereClause);

    const result = await this.query(
      `
        ${cte}
        SELECT
          sm.id,
          sm.receipt_no,
          sm.sold_at,
          sm.total_amount,
          sm.total_cost,
          sm.invoice_mode,
          (sm.total_amount - sm.total_cost) AS total_profit,
          u.full_name AS cashier_name,
          u.username AS cashier_username
        FROM sale_metrics sm
        LEFT JOIN users u ON u.id = sm.user_id
        ORDER BY sm.sold_at DESC
        LIMIT $${paramIndex}
      `,
      [...params, filters.limit || 500]
    );

    return result.rows;
  }

  async getPeriodProfitSummaries(tenant, storeFilter) {
    this.setTenant(tenant).requireTenant();

    const conditions = ['s.customer_id = $1', "s.status = 'completed'"];
    const params = [tenant.customerId];
    let paramIndex = 2;

    paramIndex = this._appendStoreFilter(
      conditions,
      params,
      paramIndex,
      tenant,
      storeFilter
    );

    const whereClause = conditions.join(' AND ');
    const cte = this._saleMetricsCte(whereClause);

    const result = await this.query(
      `
        ${cte},
        bounds AS (
          SELECT
            (now() AT TIME ZONE '${TZ}')::date AS today,
            date_trunc('week', now() AT TIME ZONE '${TZ}')::date AS week_start,
            date_trunc('month', now() AT TIME ZONE '${TZ}')::date AS month_start
        )
        SELECT
          period_key,
          COUNT(*)::int AS sale_count,
          COALESCE(SUM(total_amount), 0) AS total_revenue,
          COALESCE(SUM(total_cost), 0) AS total_cost,
          COALESCE(SUM(total_amount - total_cost), 0) AS total_profit,
          COALESCE(AVG(total_amount), 0) AS average_basket
        FROM (
          SELECT sm.*, 'today' AS period_key
          FROM sale_metrics sm, bounds b
          WHERE sm.sale_date = b.today
          UNION ALL
          SELECT sm.*, 'week' AS period_key
          FROM sale_metrics sm, bounds b
          WHERE sm.sale_date >= b.week_start
          UNION ALL
          SELECT sm.*, 'month' AS period_key
          FROM sale_metrics sm, bounds b
          WHERE sm.sale_date >= b.month_start
        ) grouped
        GROUP BY period_key
      `,
      params
    );

    const periods = {
      today: this._mapAggregateRow({}),
      week: this._mapAggregateRow({}),
      month: this._mapAggregateRow({}),
    };

    result.rows.forEach((row) => {
      if (periods[row.period_key]) {
        periods[row.period_key] = this._mapAggregateRow(row);
      }
    });

    return periods;
  }

  async getSaleDetails(tenant, saleId) {
    this.setTenant(tenant).requireTenant();

    const saleResult = await this.query(
      `
        SELECT
          s.id,
          s.receipt_no,
          s.total_amount,
          s.item_count,
          s.cash_received,
          s.change_amount,
          s.invoice_mode,
          s.invoice_customer_name,
          s.invoice_tax_no,
          s.invoice_tax_office,
          s.invoice_phone,
          s.invoice_address,
          s.invoice_email,
          s.sold_at,
          s.created_at,
          s.store_id,
          st.name AS store_name,
          u.full_name AS cashier_name,
          u.username AS cashier_username
        FROM sales s
        INNER JOIN stores st ON st.id = s.store_id
        LEFT JOIN users u ON u.id = s.user_id
        WHERE s.id = $1
          AND s.customer_id = $2
          AND s.status = 'completed'
        LIMIT 1
      `,
      [saleId, tenant.customerId]
    );

    const sale = saleResult.rows[0];
    if (!sale) {
      return null;
    }

    const itemsResult = await this.query(
      `
        SELECT
          si.id,
          si.product_id,
          si.quantity,
          si.unit_price,
          si.purchase_price,
          si.vat_rate,
          si.line_total,
          p.name AS product_name,
          p.barcode,
          COALESCE(si.purchase_price, p.purchase_price, 0) AS effective_purchase_price,
          (si.unit_price - COALESCE(si.purchase_price, p.purchase_price, 0)) * si.quantity AS line_profit
        FROM sale_items si
        INNER JOIN products p ON p.id = si.product_id
        WHERE si.sale_id = $1
        ORDER BY si.created_at ASC
      `,
      [saleId]
    );

    const items = itemsResult.rows;
    const totalCost = items.reduce(
      (sum, row) => sum + Number(row.effective_purchase_price) * Number(row.quantity),
      0
    );
    const totalProfit = Number(sale.total_amount) - totalCost;

    return {
      sale,
      items,
      total_cost: totalCost,
      total_profit: totalProfit,
    };
  }

  async getTopProducts(tenant, filters, limit = 10) {
    this.setTenant(tenant).requireTenant();

    const conditions = ['s.customer_id = $1', "s.status = 'completed'"];
    const params = [tenant.customerId];
    let paramIndex = 2;

    paramIndex = this._appendStoreFilter(conditions, params, paramIndex, tenant, filters);
    paramIndex = this._appendDateFilters(conditions, params, paramIndex, filters);

    const result = await this.query(
      `
        SELECT
          p.name AS product_name,
          COALESCE(SUM(si.quantity), 0) AS total_quantity,
          COALESCE(SUM(si.line_total), 0) AS total_revenue
        FROM sale_items si
        INNER JOIN sales s ON s.id = si.sale_id
        INNER JOIN products p ON p.id = si.product_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY p.id, p.name
        ORDER BY total_quantity DESC
        LIMIT $${paramIndex}
      `,
      [...params, limit]
    );

    return result.rows;
  }

  async getCashierSales(tenant, filters) {
    this.setTenant(tenant).requireTenant();

    const conditions = ['s.customer_id = $1', "s.status = 'completed'"];
    const params = [tenant.customerId];
    let paramIndex = 2;

    paramIndex = this._appendStoreFilter(conditions, params, paramIndex, tenant, filters);
    paramIndex = this._appendDateFilters(conditions, params, paramIndex, filters);

    const result = await this.query(
      `
        SELECT
          COALESCE(NULLIF(TRIM(u.full_name), ''), u.username, 'Bilinmiyor') AS cashier_name,
          COUNT(*)::int AS sale_count,
          COALESCE(SUM(s.total_amount), 0) AS total_revenue
        FROM sales s
        LEFT JOIN users u ON u.id = s.user_id
        WHERE ${conditions.join(' AND ')}
        GROUP BY u.id, u.full_name, u.username
        ORDER BY total_revenue DESC
      `,
      params
    );

    return result.rows;
  }

  async findSales(tenant, filters) {
    this.setTenant(tenant).requireTenant();

    const conditions = ['s.customer_id = $1', "s.status = 'completed'"];
    const params = [tenant.customerId];
    let paramIndex = 2;

    if (!filters.allStores && filters.storeId) {
      conditions.push(`s.store_id = $${paramIndex}`);
      params.push(filters.storeId);
      paramIndex += 1;
    }

    if (filters.startDate) {
      conditions.push(`s.sold_at >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex += 1;
    }

    if (filters.endDate) {
      conditions.push(`s.sold_at <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex += 1;
    }

    const result = await this.query(
      `
        SELECT
          s.id,
          s.customer_id,
          s.store_id,
          st.name AS store_name,
          s.user_id,
          u.username AS user_username,
          u.full_name AS user_full_name,
          s.receipt_no,
          s.status,
          s.total_amount,
          s.item_count,
          s.cash_received,
          s.change_amount,
          s.client_sale_id,
          s.sold_at,
          s.created_at
        FROM sales s
        INNER JOIN stores st ON st.id = s.store_id
        LEFT JOIN users u ON u.id = s.user_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY s.sold_at DESC
        LIMIT $${paramIndex}
      `,
      [...params, filters.limit || 200]
    );

    return result.rows;
  }

  async getSummary(tenant, filters) {
    this.setTenant(tenant).requireTenant();

    const conditions = ['customer_id = $1', "status = 'completed'"];
    const params = [tenant.customerId];
    let paramIndex = 2;

    if (!filters.allStores && filters.storeId) {
      conditions.push(`store_id = $${paramIndex}`);
      params.push(filters.storeId);
      paramIndex += 1;
    }

    if (filters.startDate) {
      conditions.push(`sold_at >= $${paramIndex}`);
      params.push(filters.startDate);
      paramIndex += 1;
    }

    if (filters.endDate) {
      conditions.push(`sold_at <= $${paramIndex}`);
      params.push(filters.endDate);
      paramIndex += 1;
    }

    const whereClause = conditions.join(' AND ');

    const summaryResult = await this.query(
      `
        SELECT
          COUNT(*)::int AS sale_count,
          COALESCE(SUM(total_amount), 0) AS total_revenue,
          COALESCE(AVG(total_amount), 0) AS average_basket
        FROM sales
        WHERE ${whereClause}
      `,
      params
    );

    const dailyResult = await this.query(
      `
        SELECT
          DATE(sold_at) AS date,
          COUNT(*)::int AS sale_count,
          COALESCE(SUM(total_amount), 0) AS total_revenue,
          COALESCE(AVG(total_amount), 0) AS average_basket
        FROM sales
        WHERE ${whereClause}
        GROUP BY DATE(sold_at)
        ORDER BY DATE(sold_at) DESC
      `,
      params
    );

    return {
      summary: summaryResult.rows[0],
      daily: dailyResult.rows,
    };
  }
}

module.exports = {
  ReportRepository,
};
