import test from 'ava';
import express from 'express';
import bodyParser from 'body-parser';
import sinon from 'sinon';
import request from 'supertest';
import withdrawHandler from '../pages/api/withdraw.js';
import depositHandler from '../pages/api/deposit.js';
import { handleWithdraw, handleDeposit } from '../services/smartContractService.js';

// Set up Express app
const app = express();
app.use(bodyParser.json());
app.post('/api/withdraw', (req, res) => withdrawHandler(req, res));
app.post('/api/deposit', (req, res) => depositHandler(req, res));

test.beforeEach(() => {
  sinon.restore();
  sinon.stub(handleWithdraw);
  sinon.stub(handleDeposit);
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

  handleWithdraw.resolves(serviceResponse);

  const response = await request(app).post('/api/withdraw').send(requestData);

  t.is(response.status, 200);
  t.deepEqual(response.body, serviceResponse);
  t.true(handleWithdraw.calledOnceWithExactly(requestData));
});

test('POST /api/withdraw should return error for invalid input', async (t) => {
  const requestData = {
    userId: '1',
    percentage: 0,
    receiptuuid: '',
  };

  handleWithdraw.rejects(new Error('Invalid percentage value'));

  const response = await request(app).post('/api/withdraw').send(requestData);

  t.is(response.status, 400);
  t.deepEqual(response.body, { error: 'Invalid percentage value' });
  t.true(handleWithdraw.calledOnceWithExactly(requestData));
});

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

  handleDeposit.resolves(serviceResponse);

  const response = await request(app).post('/api/deposit').send(requestData);

  t.is(response.status, 200);
  t.deepEqual(response.body, serviceResponse);
  t.true(handleDeposit.calledOnceWithExactly(requestData));
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
  t.true(handleDeposit.calledOnceWithExactly(requestData));
});

test('GET /api/withdraw should return 405 Method Not Allowed', async (t) => {
  const response = await request(app).get('/api/withdraw');
  t.is(response.status, 405);
  t.is(response.text, 'Method GET Not Allowed');
});

test('GET /api/deposit should return 405 Method Not Allowed', async (t) => {
  const response = await request(app).get('/api/deposit');
  t.is(response.status, 405);
  t.is(response.text, 'Method GET Not Allowed');
});

