// Generated by CoffeeScript 1.6.3
var Schema, TestItem, TestItemSchema, async, cacheExpires, clearDb, generateMocks, itemsCount, maxQueriesCount, mockNames, mongoose, mongooseRedisCache, runTestRound, testRounds, timeout, totalTimeWithRedis, totalTimeWithoutRedis, _;

mongoose = require("mongoose");

Schema = mongoose.Schema;

async = require("async");

_ = require("underscore");

mongooseRedisCache = require("../index");

itemsCount = 100;

testRounds = 5;

cacheExpires = 60;

timeout = 1000 * 30;

totalTimeWithoutRedis = 0;

totalTimeWithRedis = 0;

mockNames = ["Jacob", "Sophia", "Mason", "Isabella", "William", "Emma", "Jayden", "Olivia", "Noah", "Ava", "Michael", "Emily", "Ethan", "Abigail", "Alexander", "Madison", "Aiden", "Mia", "Daniel", "Chloe"];

maxQueriesCount = mockNames.length;

mongoose.connect("mongodb://localhost:27017/mongoose-redis-test");

TestItemSchema = new Schema({
  num1: Number,
  num2: Number,
  num3: Number,
  date: {
    type: String,
    "default": Date.now()
  },
  friends: [String],
  name: {
    type: String,
    index: true
  }
});

TestItemSchema.set('redisCache', true);

TestItemSchema.set('expires', cacheExpires);

TestItem = mongoose.model('TestItem', TestItemSchema);

clearDb = function(callback) {
  return TestItem.remove(callback);
};

generateMocks = function(amount, callback) {
  var count, items;
  count = 0;
  items = [];
  while (count < amount) {
    items.push({
      name: mockNames[Math.floor(Math.random() * mockNames.length)],
      num1: Math.random() * 10000,
      num2: Math.random() * 10000,
      num3: Math.random() * 10000,
      friends: _.shuffle(mockNames).slice(0, Math.floor(Math.random() * 5))
    });
    count++;
  }
  return TestItem.create(items, callback);
};

runTestRound = function(callback) {
  var cb, currQueryCount, fn, test, timeSpentArr;
  currQueryCount = 0;
  timeSpentArr = [];
  test = function() {
    return currQueryCount < maxQueriesCount;
  };
  fn = function(cb) {
    var query, queryStartTime;
    queryStartTime = new Date();
    query = TestItem.find({});
    query.where("name", mockNames[currQueryCount]);
    query.lean();
    return query.exec(function(err, result) {
      var queryEndTime, timeSpent;
      if (err) {
        throw err;
      }
      queryEndTime = new Date();
      timeSpent = queryEndTime - queryStartTime;
      timeSpentArr.push(timeSpent);
      currQueryCount++;
      return cb(null);
    });
  };
  cb = function() {
    var averageTime, t, totalTime, _i, _len;
    totalTime = 0;
    for (_i = 0, _len = timeSpentArr.length; _i < _len; _i++) {
      t = timeSpentArr[_i];
      totalTime += t;
    }
    averageTime = totalTime / maxQueriesCount;
    return callback(null, {
      totalTime: totalTime,
      averageTime: averageTime
    });
  };
  return async.whilst(test, fn, cb);
};

before(function(done) {
  console.log("=========================\nMongoose-Redis Cache Test\n=========================\nTotal items in DB: " + itemsCount + "\nTotal number of queries per round: " + maxQueriesCount + "\nTotal number of rounds: " + testRounds + "\n");
  this.timeout(60000);
  return clearDb(function() {
    console.log("Generating " + itemsCount + " mocks...");
    return generateMocks(itemsCount, function(err) {
      if (err) {
        throw err;
      }
      return TestItem.ensureIndexes(done);
    });
  });
});

describe("Mongoose queries without caching", function() {
  var count, totalTime, _i;
  before(function() {
    return console.log("\n--------------------------------\nTest query without Redis caching\n--------------------------------\nBegin executing queries without caching");
  });
  totalTime = 0;
  for (count = _i = 1; 1 <= testRounds ? _i <= testRounds : _i >= testRounds; count = 1 <= testRounds ? ++_i : --_i) {
    it("Run " + count, function(done) {
      this.timeout(timeout);
      return runTestRound(function(err, result) {
        totalTime += result.totalTime;
        return done();
      });
    });
  }
  return after(function() {
    console.log("\n\nTotal time for " + testRounds + " test rounds:", totalTime + "ms");
    console.log("Average time for each round:", (totalTime / testRounds).toFixed(2) + "ms");
    return totalTimeWithoutRedis = totalTime;
  });
});

describe("Mongoose queries with caching", function() {
  var count, totalTime, _i;
  before(function() {
    return mongooseRedisCache(mongoose, null, function(err) {
      return console.log("\n--------------------------------\nTest query with Redis caching\n--------------------------------\nBegin executing queries with Redis caching");
    });
  });
  totalTime = 0;
  for (count = _i = 1; 1 <= testRounds ? _i <= testRounds : _i >= testRounds; count = 1 <= testRounds ? ++_i : --_i) {
    it("Run " + count, function(done) {
      this.timeout(timeout);
      return runTestRound(function(err, result) {
        totalTime += result.totalTime;
        return done();
      });
    });
  }
  return after(function() {
    console.log("\n\nTotal time for " + testRounds + " test rounds:", totalTime + "ms");
    console.log("Average time for each round:", (totalTime / testRounds).toFixed(2) + "ms");
    return totalTimeWithRedis = totalTime;
  });
});

after(function(done) {
  console.log("------------\nCONCLUSION\n------------\nCaching with Redis makes Mongoose lean queries faster by " + (totalTimeWithoutRedis - totalTimeWithRedis) + " ms.\nThat's " + ((totalTimeWithoutRedis / totalTimeWithRedis * 100).toFixed(2)) + "% faster!  ");
  console.log("\n\nEnd tests. \nWiping DB and exiting");
  return clearDb(done);
});
