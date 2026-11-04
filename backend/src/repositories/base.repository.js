const { getPool } = require('../db/pool');

class TenantRequiredError extends Error {
  constructor(message = 'customer_id zorunlu') {
    super(message);
    this.name = 'TenantRequiredError';
  }
}

function assertTenant(tenant) {
  if (!tenant || !tenant.customerId) {
    throw new TenantRequiredError();
  }
}

function assertStore(tenant) {
  assertTenant(tenant);

  if (!tenant.storeId) {
    throw new TenantRequiredError('store_id zorunlu');
  }
}

class BaseRepository {
  constructor(tenant = null) {
    this.tenant = tenant;
  }

  setTenant(tenant) {
    this.tenant = tenant;
    return this;
  }

  requireTenant() {
    assertTenant(this.tenant);
    return this.tenant;
  }

  requireStore() {
    assertStore(this.tenant);
    return this.tenant;
  }

  async query(text, params = []) {
    return getPool().query(text, params);
  }

  async queryWithClient(client, text, params = []) {
    return client.query(text, params);
  }

  /**
   * WHERE parçası: customer_id = $n
   * @param {number} paramIndex - placeholder index (1-based)
   */
  customerWhere(paramIndex = 1) {
    this.requireTenant();
    return {
      clause: `customer_id = $${paramIndex}`,
      params: [this.tenant.customerId],
    };
  }

  /**
   * WHERE parçası: customer_id = $n AND store_id = $m
   */
  storeWhere(customerParamIndex = 1, storeParamIndex = 2) {
    this.requireStore();
    return {
      clause: `customer_id = $${customerParamIndex} AND store_id = $${storeParamIndex}`,
      params: [this.tenant.customerId, this.tenant.storeId],
    };
  }

  /**
   * Sorguya tenant filtresi ekler (mevcut WHERE varsayılır).
   */
  appendCustomerFilter(sql, paramIndex) {
    const { clause, params } = this.customerWhere(paramIndex);
    return {
      sql: `${sql} AND ${clause}`,
      params,
    };
  }
}

module.exports = {
  BaseRepository,
  assertTenant,
  assertStore,
  TenantRequiredError,
};
