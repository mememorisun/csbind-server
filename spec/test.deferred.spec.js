'use strict';

var _ = require("underscore-contrib");
var def = require("deferred");

var csbs = require("../index");
var fake = require("./utils/fake");

describe('csbind-server test', function() {

  var testData, socket, necKeys, rval;

  beforeEach(function() {

    rval = function(x) {
      return csbs.deepClone({
        content: "chat" + x,
        author: "author" + x,
        date: new Date(2014, 10, x)
      });
    };

    testData = [rval(0), rval(1), rval(2)];
  });

  describe('observable test with socketIO', function() {

    var funcs, fs, val, genFuncs;

    beforeEach(function() {

      socket = fake.mockSio;

      necKeys = ['content', 'author', 'date'];

      genFuncs = function(testData) {
        var td = csbs.deepClone(testData);

        return {
          update: function(data) {
            console.log('update called' + data);
          },

          receive: function(event, setReceived) {
            socket.on(event, function(data) {
              setReceived(data);
            });
          },

          send: function(event, data) {
            socket.setc(td);
            socket.emit(event, data);
          },

          get: function() {
            var d = def();
            setTimeout(function() {
              d.resolve(td);
            }, 100)
            return d.promise;
          },

          insert: function(data) {
            var d = def();
            setTimeout(function() {
              Array.prototype.splice.apply(td, _.cat([data.index, 0], data.values));
              d.resolve();
            }, 100)
            return d.promise;
          },

          edit: function(data) {
            var d = def();
            setTimeout(function() {
              Array.prototype.splice.apply(td, _.cat([data.index, data.values.length], data.values));
              d.resolve();
            }, 100)
            return d.promise;
          },

          add: function(data) {
            var d = def();
            setTimeout(function() {
              Array.prototype.push.apply(td, data.values);
              d.resolve();
            }, 100)
            return d.promise;
          },

          remove: function(data) {
            var d = def();
            setTimeout(function() {
              Array.prototype.splice.apply(td, [data.index, 1]);
              d.resolve();
            }, 100)
            return d.promise;
          },

          err: function(e) {
            console.log('error: ' + e);
          }
        };
      };

      funcs = genFuncs(testData);

      fs = {
        receive: funcs.receive,
        send: funcs.send,
        edit: funcs.edit,
        remove: funcs.remove,
        add: funcs.add,
        insert: funcs.insert
      };

      val = {
        content: "chat4",
        author: "author4",
        date: new Date(),
        callback: function() {
          console.log("4");
        }
      };


      spyOn(funcs, "update").and.callThrough();
      spyOn(funcs, "receive").and.callThrough();
      spyOn(funcs, "send").and.callThrough();
      spyOn(funcs, "err").and.callThrough();
      spyOn(funcs, "edit").and.callThrough();
      spyOn(funcs, "insert").and.callThrough();
      spyOn(funcs, "remove").and.callThrough();
      spyOn(funcs, "add").and.callThrough();
    });

    describe('observal関数のテスト', function() {

      it("observable関数を呼び出したとき引数を3つセットしなければいけない。", function() {
        expect(function() {
          csbs.observable();
        }).toThrow();
      });

      it("observable関数を呼び出したとき第一引数はStringでないといけない。", function() {
        csbs.observable(0, fs, necKeys, 'deferred', funcs.err);
        expect(funcs.err).toHaveBeenCalled();
      });

      it("observable関数を呼び出したとき第二引数のハッシュの値は関数でないといけない。", function() {
        csbs.observable('test', {
          receive: ['test'],
          send: ['test'],
          edit: ['test'],
          remove: ['test'],
          insert: ['test'],
          add: ['test']
        }, necKeys, 'deferred', funcs.err);
        expect(funcs.err).toHaveBeenCalled();
      });

      it("observable関数を呼び出したとき第二引数のハッシュのプロパティはsend,receive,insert,edit,add,removeでないといけない。", function() {
        csbs.observable('test', {
          receive: funcs.send,
          sends: funcs.receive,
          edit: funcs.receive,
          remove: funcs.receive,
          insert: funcs.receive,
          add: funcs.receive
        }, necKeys, 'deferred', funcs.err);
        expect(funcs.err).toHaveBeenCalled();
      });

      it("observable関数を呼び出したとき第三引数はstringの配列でないといけない。", function() {
        csbs.observable('test', fs, [0, '0'], 'deferred', funcs.err);
        expect(funcs.err).toHaveBeenCalled();
      });

      it("observable関数を呼び出したとき第五引数を登録する場合は関数でないといけない。", function() {
        expect(function() {
          csbs.observable('test', fs, necKeys, 'deferred', ['test']);
        }).toThrow();
      });

      it("observable関数を呼び出したとき、第五引数に関数が登録されていてエラーが起きると、その関数が呼ばれる。", function() {
        csbs.observable(0, fs, necKeys, 'deferred', funcs.err);
        expect(funcs.err).toHaveBeenCalled();
      });

      it("observable関数を呼び出したとき、登録した関数はまだ呼ばれない。", function() {
        csbs.observable('test', fs, necKeys, 'deferred', funcs.err);
        expect(funcs.send).not.toHaveBeenCalled();
        expect(funcs.receive).not.toHaveBeenCalled();
        expect(funcs.edit).not.toHaveBeenCalled();
        expect(funcs.insert).not.toHaveBeenCalled();
        expect(funcs.remove).not.toHaveBeenCalled();
        expect(funcs.add).not.toHaveBeenCalled();
        expect(funcs.err).not.toHaveBeenCalled();
      });

    });

    describe("start関数のテスト", function() {

      it("start関数には引数が必要である。", function() {
        expect(function() {
          csbs.observable('test', fs, 'deferred', necKeys).start();
        }).toThrow();
      });

      it("start関数を呼び出したとき第一引数は、登録したキーを持つオブジェクトの配列を返す関数でないといけない。", function() {
        csbs.observable('test', fs, necKeys, 'deferred', funcs.err).start(function() {
          return [{
            test: 'test'
          }];
        }, funcs.err);
        expect(funcs.err).toHaveBeenCalled();
      });

      it("start関数を呼び出したとき第二引数の値は関数でないといけない。", function() {
        expect(function() {
          csbs.observable('test', fs, necKeys, 'deferred').start(testData, 0);
        }).toThrow();
      });

      it("start関数を呼び出したとき、処理の途中でエラーが投げられた場合、第二引数の関数が呼ばれる。", function() {
        funcs.receive = function() {
          throw new Error('receive');
        };
        csbs.observable('test', {
          receive: funcs.receive,
          send: funcs.send,
          edit: funcs.edit,
          remove: funcs.remove,
          insert: funcs.insert,
          add: funcs.add
        }, necKeys, 'deferred').start(testData, funcs.err);
        expect(funcs.err).toHaveBeenCalled();
      });

    });

    describe("set関数のテスト", function() {

      it("deferredの時、set関数はチェーンできない。", function() {
        expect(function() {
          csbs.observable('test', fs, necKeys, 'deferred').start(funcs.get).set({
            index: 0,
            values: [val],
            mode: 'add'
          }, funcs.err);
        }).toThrow();
      });

      describe('Async test', function() {
        var obs;
        beforeEach(function(done) {
          csbs.observable('test', fs, necKeys, 'deferred').start(funcs.get).then(function(rObs) {
            obs = rObs;
            done();
          });
        });

        it("set関数には引数が必要である。", function() {
          expect(function() {
            obs.set();
          }).toThrow();
        });

        it("set関数を呼び出したとき第一引数の値はオブジェクトでないといけない。", function() {
          obs.set(['test'], funcs.err);
          expect(funcs.err).toHaveBeenCalled();
        });

        it("set関数を呼び出したとき第一引数のオブジェクトのプロパティはindex,values,modeでないといけない。", function() {
          obs.set({
            index: 0,
            valuess: [val],
            mode: 'add'
          }, funcs.err);
          expect(funcs.err).toHaveBeenCalled();
        });

        it("set関数を呼び出したとき第二引数は関数でないといけない。", function() {
          expect(function() {
            obs.set({
              index: 0,
              values: [val],
              mode: 'add'
            }, 'test');
          }).toThrow();
        });

        it("set関数を呼び出したとき第一引数のオブジェクトのmodeプロパティはinsert,add,remove,editのいずれかでないといけない。", function() {
          obs.set({
            index: 0,
            values: [val],
            mode: 'adds'
          }, funcs.err);
          expect(funcs.err).toHaveBeenCalled();
        });

      });

      describe('Async test', function() {
        var obs, fus;
        beforeEach(function(done) {
          fus = genFuncs(testData);
          fus.send = function() {
            throw new Error('send');
          };
          spyOn(fus, "send").and.callThrough();
          spyOn(fus, "err").and.callThrough();
          csbs.observable('test', fus, necKeys, 'deferred').start(fus.get).then(function(rObs) {
            rObs.set({
              index: 0,
              values: [val],
              mode: 'edit'
            }, function(e) {
              fus.err(e);
              done();
            });
          });
        });

        it("set関数を呼び出したとき、処理の途中でエラーが投げられた場合、第二引数の関数が呼ばれる。", function() {
          expect(fus.err).toHaveBeenCalled();
        });
      });


      describe('Async test', function() {
        var obs;
        beforeEach(function(done) {
          csbs.observable('test', fs, necKeys, 'deferred').start(funcs.get).then(function(rObs) {
            obs = rObs;
            done();
          });
        });

        it("set関数でaddを呼び出したとき第一引数のオブジェクトのindexプロパティは必要ない。", function() {
          obs.set({
            values: [val],
            mode: 'add'
          }, funcs.err);
          expect(funcs.err).not.toHaveBeenCalled();
        });

        it("set関数でaddを呼び出したとき第一引数のオブジェクトのvalueプロパティが必要である。", function() {
          obs.set({
            index: -1,
            valuess: [val],
            mode: 'add'
          }, funcs.err);
          expect(funcs.err).toHaveBeenCalled();
        });

        it("set関数でeditを呼び出したとき第一引数のオブジェクトのindexプロパティが必要である。", function() {
          obs.set({
            values: [val],
            mode: 'edit'
          }, funcs.err);
          expect(funcs.err).toHaveBeenCalled();
        });

        it("set関数でeditを呼び出したとき第一引数のオブジェクトのvaluesプロパティが必要である。", function() {
          obs.set({
            index: 0,
            mode: 'edit'
          }, funcs.err);
          expect(funcs.err).toHaveBeenCalled();
        });

        it("set関数でinsertを呼び出したとき第一引数のオブジェクトのindexプロパティが必要である。", function() {
          obs.set({
            values: [val],
            mode: 'insert'
          }, funcs.err);
          expect(funcs.err).toHaveBeenCalled();
        });

        it("set関数でinsertを呼び出したとき第一引数のオブジェクトのvaluesプロパティが必要である。", function() {
          obs.set({
            index: 0,
            mode: 'insert'
          }, funcs.err);
          expect(funcs.err).toHaveBeenCalled();
        });

        it("set関数でremoveを呼び出したとき第一引数のオブジェクトのindexプロパティが必要である。", function() {
          obs.set({
            values: [val],
            mode: 'remove'
          }, funcs.err);
          expect(funcs.err).toHaveBeenCalled();
        });

        it("set関数でremoveを呼び出したとき第一引数のオブジェクトのvaluesプロパティは省略可能である。", function() {
          obs.set({
            index: 0,
            mode: 'remove'
          }, funcs.err);
          expect(funcs.err).not.toHaveBeenCalled();
        });

        it("set関数を呼び出したとき第一引数のオブジェクトのindexプロパティは数字である必要がある。", function() {
          obs.set({
            values: [val],
            index: 'test',
            mode: 'insert'
          }, funcs.err);
          expect(funcs.err).toHaveBeenCalled();
        });

        it("set関数を呼び出したとき第一引数のオブジェクトのindexプロパティは0以上である必要がある。", function() {
          obs.set({
            values: [val],
            index: -1,
            mode: 'insert'
          }, funcs.err);
          expect(funcs.err).toHaveBeenCalled();
        });

        it("set関数を呼び出したとき第一引数のオブジェクトのindexプロパティは現在のデータのlengthまでである必要がある。", function() {
          obs.set({
            values: [val],
            index: testData.length + 1,
            mode: 'insert'
          }, funcs.err);
          expect(funcs.err).toHaveBeenCalled();
        });

      });


      describe('Async test', function() {
        var obs, chkData, chk, fus;
        beforeEach(function(done) {
          fus = genFuncs(testData);
          chkData = {
            values: [val, val],
            index: 3,
            mode: 'insert',
            id: 5
          };
          chk = {};
          fus.send = (function() {
            return function(eventName, data) {
              chk = {
                event: eventName,
                data: data
              };
            };
          })();
          spyOn(fus, "send").and.callThrough();
          spyOn(fus, "err").and.callThrough();
          csbs.observable('test', fus, necKeys, 'deferred').start(fus.get).then(function(rObs) {
            return rObs.set({
              values: [val, val],
              index: 3,
              mode: 'insert',
              id: 5
            }, fus.err);
          }).then(function(rObs) {
            obs = rObs;
            done();
          });
        });

        it("set関数を呼び出したときsend関数がイベント名とデータを引数として呼び出される。", function() {
          expect(_.isEqual(chkData, chk.data)).toBeTruthy();
          expect(_.isEqual('csbindReceivetest', chk.event)).toBeTruthy();
          expect(funcs.err).not.toHaveBeenCalled();
        });
      });

    });

    describe("_setReceived関数、get関数、addUpdate関数のテスト", function() {

      var chk;

      beforeEach(function() {
        chk = {
          newValues: undefined,
          data: undefined
        };
        funcs.update = (function() {
          return function(newValues, data) {
            chk = {
              newValues: newValues,
              data: data
            };
          };
        })();
        spyOn(funcs, "update").and.callThrough();
      });

      describe('Async test', function() {
        var obs;
        beforeEach(function(done) {
          csbs.observable('test', fs, necKeys, 'deferred').start(funcs.get).then(function(rObs) {
            obs = rObs;
            done();
          });
        });

        it("addUpdates関数には引数が必要である。", function() {
          expect(function() {
            obs.addUpdates();
          }).toThrow();
        });

        it("addUpdates関数の第一引数は関数の配列である必要がある。", function() {
          obs.addUpdates([1, 2], funcs.err).then(function() {
            expect(funcs.err).toHaveBeenCalled()
          });
        });

        it("addUpdates関数の第二引数は関数である必要がある。", function() {
          expect(function() {
            obs.addUpdates([funcs.update], 0);
          }).toThrow();
        });

      });

      describe('Async test', function() {

        var chk, obs, fus;

        beforeEach(function(done) {
          fus = genFuncs(testData);
          chk = {
            newValues: undefined,
            data: undefined
          };
          fus.update = (function() {
            return function(newValues, data) {
              chk = {
                newValues: newValues,
                data: data
              };
            };
          })();
          spyOn(fus, "update").and.callThrough();
          spyOn(fus, "send").and.callThrough();
          csbs.observable('test', fus, necKeys, 'deferred').start(fus.get)
            .then(function(rObs) {
              return rObs.addUpdates([fus.update, fus.update]);
            })
            .then(function(rObs) {
              return rObs.set({
                values: [val],
                index: 0,
                mode: 'insert'
              });
            })
            .then(function(rObs) {
              obs = rObs;
              done();
            });
        });

        it("_setReceivedが呼ばれると登録しているupdate関数と_check関数が呼ばれる。", function() {
          expect(_.isEqual([val, rval(0), rval(1), rval(2)], chk.newValues)).toBeTruthy();
          expect(_.isEqual({
            values: [val],
            index: 0,
            mode: 'insert'
          }, chk.data)).toBeTruthy();
          expect(fus.update.calls.count()).toBe(2);
          expect(fus.send.calls.count()).toBe(1);
        });

      });


      describe('Async test', function() {

        var chk, obs, fus, result;

        beforeEach(function(done) {
          fus = genFuncs(testData);
          chk = {
            newValues: undefined,
            data: undefined
          };
          fus.update = (function() {
            return function(newValues, data) {
              chk = {
                newValues: newValues,
                data: data
              };
            };
          })();
          spyOn(fus, "update").and.callThrough();
          spyOn(fus, "send").and.callThrough();
          csbs.observable('test', fus, necKeys, 'deferred').start(fus.get)
            .then(function(rObs) {
              return rObs.addUpdates([fus.update, fus.update]);
            })
            .then(function(rObs) {
              return rObs.set({
                values: [],
                index: 0,
                mode: 'insert'
              });
            })
            .catch(function(rObs) {
              return rObs.get();
            })
            .then(function(re) {
              result = re;
              done();
            });
        });

        it("_setReceivedが呼ばれても、値に変化がなければ登録しているupdate関数は呼ばれない。", function() {
          expect(_.isEqual([rval(0), rval(1), rval(2)], result)).toBeTruthy();
          expect(_.isEqual(undefined, chk.newValues)).toBeTruthy();
          expect(_.isEqual(undefined, chk.data)).toBeTruthy();
          expect(fus.update.calls.count()).toBe(0);
          expect(fus.send.calls.count()).toBe(0);
        });
      });

      describe('Async test', function() {

        var chk, obs, fus, result;

        beforeEach(function(done) {
          fus = genFuncs(testData);
          chk = {
            newValues: undefined,
            data: undefined
          };
          fus.update = (function() {
            return function(newValues, data) {
              chk = {
                newValues: newValues,
                data: data
              };
            };
          })();
          spyOn(fus, "update").and.callThrough();
          spyOn(fus, "send").and.callThrough();
          csbs.observable('test', fus, necKeys, 'deferred').start(fus.get)
            .then(function(rObs) {
              return rObs.addUpdates([fus.update, fus.update]);
            })
            .then(function(rObs) {
              return rObs.set({
                values: [val, val],
                index: 2,
                mode: 'insert'
              });
            })
            .then(function(rObs) {
              return rObs.get();
            })
            .then(function(re) {
              result = re;
              done();
            });
        });

        it("set関数でinsertするとき複数の値を挿入できる。", function() {
          expect(_.isEqual([rval(0), rval(1), val, val, rval(2)], chk.newValues)).toBeTruthy();
          expect(_.isEqual({
            values: [val, val],
            index: 2,
            mode: 'insert'
          }, chk.data)).toBeTruthy();
          expect(_.isEqual([rval(0), rval(1), val, val, rval(2)], result)).toBeTruthy();
          expect(fus.update.calls.count()).toBe(2);
        });

      });


      describe('Async test', function() {

        var chk, obs, fus, result;

        beforeEach(function(done) {
          fus = genFuncs(testData);
          chk = {
            newValues: undefined,
            data: undefined
          };
          fus.update = (function() {
            return function(newValues, data) {
              chk = {
                newValues: newValues,
                data: data
              };
            };
          })();
          spyOn(fus, "update").and.callThrough();
          spyOn(fus, "send").and.callThrough();
          csbs.observable('test', fus, necKeys, 'deferred').start(fus.get)
            .then(function(rObs) {
              return rObs.addUpdates([fus.update, fus.update]);
            })
            .then(function(rObs) {
              return rObs.set({
                values: [val, val],
                mode: 'add'
              });
            })
            .then(function(rObs) {
              return rObs.get();
            })
            .then(function(re) {
              result = re;
              done();
            });
        });

        it("set関数でaddするとき複数の値を追加できる。", function() {
          expect(_.isEqual([rval(0), rval(1), rval(2), val, val], chk.newValues)).toBeTruthy();
          expect(_.isEqual({
            values: [val, val],
            mode: 'add'
          }, chk.data)).toBeTruthy();
          expect(_.isEqual([rval(0), rval(1), rval(2), val, val], result)).toBeTruthy();
          expect(fus.update.calls.count()).toBe(2);
        });

      });


      describe('Async test', function() {

        var chk, obs, fus, result;

        beforeEach(function(done) {
          fus = genFuncs(testData);
          chk = {
            newValues: undefined,
            data: undefined
          };
          fus.update = (function() {
            return function(newValues, data) {
              chk = {
                newValues: newValues,
                data: data
              };
            };
          })();
          spyOn(fus, "update").and.callThrough();
          spyOn(fus, "send").and.callThrough();
          csbs.observable('test', fus, necKeys, 'deferred').start(fus.get)
            .then(function(rObs) {
              return rObs.addUpdates([fus.update, fus.update]);
            })
            .then(function(rObs) {
              return rObs.set({
                values: [val, val],
                mode: 'edit',
                index: 1
              });
            })
            .then(function(rObs) {
              return rObs.get();
            })
            .then(function(re) {
              result = re;
              done();
            });
        });

        it("set関数でeditするとき複数の値を編集できる。", function() {
          expect(_.isEqual([rval(0), val, val], chk.newValues)).toBeTruthy();
          expect(_.isEqual({
            values: [val, val],
            mode: 'edit',
            index: 1
          }, chk.data)).toBeTruthy();
          expect(_.isEqual([rval(0), val, val], result)).toBeTruthy();
          expect(fus.update.calls.count()).toBe(2);
        });

      });

      describe('Async test', function() {

        var chk, obs, fus, result;

        beforeEach(function(done) {
          fus = genFuncs(testData);
          chk = {
            newValues: undefined,
            data: undefined
          };
          fus.update = (function() {
            return function(newValues, data) {
              chk = {
                newValues: newValues,
                data: data
              };
            };
          })();
          spyOn(fus, "update").and.callThrough();
          spyOn(fus, "send").and.callThrough();
          csbs.observable('test', fus, necKeys, 'deferred').start(fus.get)
            .then(function(rObs) {
              return rObs.addUpdates([fus.update, fus.update]);
            })
            .then(function(rObs) {
              return rObs.set({
                mode: 'remove',
                index: 1
              });
            })
            .then(function(rObs) {
              return rObs.get();
            })
            .then(function(re) {
              result = re;
              done();
            });
        });

        it("set関数でremoveすると指定した値を編集できる。", function() {
          expect(_.isEqual([rval(0), rval(2)], chk.newValues)).toBeTruthy();
          expect(_.isEqual({
            mode: 'remove',
            index: 1
          }, chk.data)).toBeTruthy();
          expect(_.isEqual([rval(0), rval(2)], result)).toBeTruthy();
          expect(fus.update.calls.count()).toBe(2);
        });

      });


      describe('Async test', function() {

        var chk, obs, fus, result;

        beforeEach(function(done) {
          fus = genFuncs(testData);
          chk = {
            newValues: undefined,
            data: undefined
          };
          fus.update = (function() {
            return function(newValues, data) {
              chk = {
                newValues: newValues,
                data: data
              };
            };
          })();
          spyOn(fus, "update").and.callThrough();
          spyOn(fus, "send").and.callThrough();
          spyOn(fus, "receive").and.callThrough();
          csbs.observable('test', fus, necKeys, 'deferred').start(fus.get)
            .then(function(rObs) {
              return rObs.addUpdates([fus.update, fus.update]);
            })
            .then(function(rObs) {
              obs = rObs;
              done();
            });
        });

        it("_setReceive関数にcheckを送るとき、indexは省略可能である。", function() {
          expect(function() {
            socket.emit('test', {
              values: [val],
              mode: 'check'
            });
          }).not.toThrow();
          expect(fus.update.calls.count()).toBe(0);
          expect(fus.send.calls.count()).toBe(1);
          expect(fus.receive.calls.count()).toBe(1);
        });

      });

      describe('Async test', function() {

        var chk, obs, fus, result;

        beforeEach(function(done) {
          fus = genFuncs(testData);
          chk = {
            newValues: undefined,
            data: undefined
          };
          fus.update = (function() {
            return function(newValues, data) {
              chk = {
                newValues: newValues,
                data: data
              };
            };
          })();
          spyOn(fus, "update").and.callThrough();
          spyOn(fus, "send").and.callThrough();
          spyOn(fus, "receive").and.callThrough();
          csbs.observable('test', fus, necKeys, 'deferred').start(fus.get)
            .then(function(rObs) {
              return rObs.addUpdates([fus.update, fus.update]);
            })
            .then(function(rObs) {
              obs = rObs;
              done();
            });
        });

        it("_setReceive関数にcheckを送るとき、同じ値であればsendは呼ばれない。", function() {
          socket.emit('test', {
            values: testData,
            mode: 'check'
          });
          expect(fus.update.calls.count()).toBe(0);
          expect(fus.send.calls.count()).toBe(0);
          expect(fus.receive.calls.count()).toBe(1);
        });

      });

    });

  });

});
