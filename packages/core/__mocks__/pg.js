const mockQuery = jest.fn();
const mockEnd = jest.fn();
const mockConnect = jest.fn();

class Pool {
  constructor(config) {
    this.query = mockQuery;
    this.end = mockEnd;
    this.connect = mockConnect;
  }
}

module.exports = { Pool, mockQuery, mockEnd, mockConnect };
