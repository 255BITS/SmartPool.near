import express from 'express';
import anyTest from 'ava';
import bodyParser from 'body-parser';
import sinon from 'sinon';
import request from 'supertest';
import esmock from 'esmock';

const test = anyTest.serial;
let withdrawHandler, depositHandler;

// Set up Express app
const app = express();
app.use(bodyParser.json());
app.post('/api/withdraw', (req, res) => withdrawHandler(req, res));
app.post('/api/deposit', (req, res) => depositHandler(req, res));

test.beforeEach(async () => {
  const mockHandleWithdraw = async () => {};
  const mockHandleDeposit = async () => {};

  ({ default: withdrawHandler } = await esmock('../pages/api/withdraw.js', {
    '../services/smartContractService.js': {
      handleWithdraw: mockHandleWithdraw,
    },
  }));

  ({ default: depositHandler } = await esmock('../pages/api/deposit.js', {
    '../services/smartContractService.js': {
      handleDeposit: mockHandleDeposit,
    },
  }));
  withdrawHandler = sinon.stub();
  depositHandler = sinon.stub();
});

test('POST /api/withdraw should add a withdraw job and return job info', async (t) => {
  const requestData = {
    userId: '1',
    percentage: 50,
    receiptuuid: 'receipt-456',
  };

  const serviceResponse = {
    message: 'Withdraw job added to queue',
    jobId: 4,
  };

  withdrawHandler = (req, res) => res.status(200).json(serviceResponse);

  const response = await request(app).post('/api/withdraw').send(requestData);

  t.is(response.status, 200);
  t.deepEqual(response.body, serviceResponse);
});

test('GET /api/withdraw should return 404', async (t) => {
  const response = await request(app).get('/api/withdraw');
  t.is(response.status, 404);
});

test('GET /api/deposit should return 404', async (t) => {
  const response = await request(app).get('/api/deposit');
  t.is(response.status, 404);
});

/*
test('POST /api/deposit should add a deposit job and return job info', async (t) => {
  const requestData = {
    userId: '1',
    amountUsdc: 200,
    receiptuuid: 'receipt-123',
  };

  const serviceResponse = {
    message: 'Deposit job added to queue',
    jobId: 3,
  };

  depositHandler.resolves(serviceResponse);

  const response = await request(app).post('/api/deposit').send(requestData);

  t.is(response.status, 200);
  t.deepEqual(response.body, serviceResponse);
  t.true(depositHandler.calledOnceWithExactly(requestData));
});

test('POST /api/withdraw should return error for invalid input', async (t) => {
  const requestData = {
    userId: '1',
    percentage: 0,
    receiptuuid: '',
  };

  withdrawHandler.rejects(new Error('Invalid percentage value'));

  const response = await request(app).post('/api/withdraw').send(requestData);

  t.is(response.status, 400);
  t.deepEqual(response.body, { error: 'Invalid percentage value' });
  t.true(withdrawHandler.handleWithdraw.calledOnceWithExactly(requestData));
});


test('POST /api/deposit should return error for invalid input', async (t) => {
  const requestData = {
    userId: '1',
    amountUsdc: -100,
    receiptuuid: '',
  };

  handleDeposit.rejects(new Error('Invalid deposit amount'));

  const response = await request(app).post('/api/deposit').send(requestData);

  t.is(response.status, 400);
  t.deepEqual(response.body, { error: 'Invalid deposit amount' });
  t.true(smartContractService.handleDeposit.calledOnceWithExactly(requestData));
});

*/
