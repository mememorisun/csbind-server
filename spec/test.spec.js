'use strict';

var _ = require("underscore-contrib");
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

    describe('deepClone test', function() {
        it("Clone equals original.", function() {
            expect(testData).toEqual(csbs.deepClone(testData));
        });

        it("Clone equals original.", function() {
            expect(_.isEqual(testData, csbs.deepClone(testData))).toBe(true);
        });
    });

    describe('observable test with socketIO', function() {

        var funcs, fs, val;

        beforeEach(function() {

            socket = fake.mockSio;

            necKeys = ['content', 'author', 'date'];

            funcs = {
                update: function(data) {
                    console.log('update called' + data);
                },

                receive: function(event, setReceived) {
                    socket.on(event, function(data) {
                        setReceived(data);
                    });
                },

                send: function(event, data) {
                    socket.setc(testData);
                    socket.emit(event, data);
                },

                get: function() {
                    return testData;
                },

                insert: function(data) {
                    Array.prototype.splice.apply(testData, _.cat([data.index, 0], data.values));
                },

                edit: function(data) {
                    Array.prototype.splice.apply(testData, _.cat([data.index, data.values.length], data.values));
                },

                add: function(data) {
                    Array.prototype.push.apply(testData, data.values);
                },

                remove: function(data) {
                    Array.prototype.splice.apply(testData, [data.index, 1]);
                },

                err: function(e) {
                    console.log('error: ' + e);
                }
            };

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
                csbs.observable(0, fs, necKeys, funcs.err);
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
                }, necKeys, funcs.err);
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
                }, necKeys, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("observable関数を呼び出したとき第三引数はstringの配列でないといけない。", function() {
                csbs.observable('test', fs, [0, '0'], funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("observable関数を呼び出したとき第四引数を登録する場合は関数でないといけない。", function() {
                expect(function() {
                    csbs.observable('test', fs, necKeys, ['test']);
                }).toThrow();
            });

            it("observable関数を呼び出したとき、第四引数に関数が登録されていてエラーが起きると、その関数が呼ばれる。", function() {
                csbs.observable(0, fs, necKeys, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("observable関数を呼び出したとき、登録した関数はまだ呼ばれない。", function() {
                csbs.observable('test', fs, necKeys, funcs.err);
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
                    csbs.observable('test', fs, necKeys).stSart();
                }).toThrow();
            });

            it("start関数の2つ目の引数は任意である。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get);
                expect(funcs.err).not.toHaveBeenCalled();
            });

            it("start関数を呼び出したとき第一引数は、登録したキーを持つオブジェクトの配列を返す関数でないといけない。", function() {
                csbs.observable('test', fs, necKeys, funcs.err).start(function() {
                    return [{
                        test: 'test'
                    }];
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("start関数を呼び出したとき第二引数の値は関数でないといけない。", function() {
                expect(function() {
                    csbs.observable('test', fs, necKeys).start(testData, 0);
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
                }, necKeys).start(testData, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

        });

        describe("set関数のテスト", function() {

            it("set関数には引数が必要である。", function() {
                expect(function() {
                    csbs.observable('test', fs, necKeys).start(funcs.get, funcs.err).set();
                }).toThrow();
            });

            it("set関数を呼び出したとき第一引数の値はオブジェクトでないといけない。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set(['test'], funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数を呼び出したとき第一引数のオブジェクトのプロパティはindex,values,modeでないといけない。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    index: 0,
                    valuess: [val],
                    mode: 'add'
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数を呼び出したとき第二引数は関数でないといけない。", function() {
                expect(function() {
                    csbs.observable('test', fs, necKeys).start(funcs.get).set({
                        index: 0,
                        values: [val],
                        mode: 'add'
                    }, 'test');
                }).toThrow();
            });

            it("set関数を呼び出したとき、処理の途中でエラーが投げられた場合、第二引数の関数が呼ばれる。", function() {
                funcs.send = function() {
                    throw new Error('send');
                };
                csbs.observable('test', {
                    receive: funcs.receive,
                    send: funcs.send,
                    edit: funcs.edit,
                    remove: funcs.remove,
                    insert: funcs.insert,
                    add: funcs.add
                }, necKeys).start(funcs.get).set({
                    index: 0,
                    values: [val],
                    mode: 'edit'
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数を呼び出したとき第一引数のオブジェクトのmodeプロパティはinsert,add,remove,editのいずれかでないといけない。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    index: 0,
                    values: [val],
                    mode: 'adds'
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数でaddを呼び出したとき第一引数のオブジェクトのindexプロパティは必要ない。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    values: [val],
                    mode: 'add'
                }, funcs.err);
                expect(funcs.err).not.toHaveBeenCalled();
            });

            it("set関数でaddを呼び出したとき第一引数のオブジェクトのvalueプロパティが必要である。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    index: -1,
                    valuess: [val],
                    mode: 'add'
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数でeditを呼び出したとき第一引数のオブジェクトのindexプロパティが必要である。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    values: [val],
                    mode: 'edit'
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数でeditを呼び出したとき第一引数のオブジェクトのvaluesプロパティが必要である。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    index: 0,
                    mode: 'edit'
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数でinsertを呼び出したとき第一引数のオブジェクトのindexプロパティが必要である。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    values: [val],
                    mode: 'insert'
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数でinsertを呼び出したとき第一引数のオブジェクトのvaluesプロパティが必要である。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    index: 0,
                    mode: 'insert'
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数でremoveを呼び出したとき第一引数のオブジェクトのindexプロパティが必要である。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    values: [val],
                    mode: 'remove'
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数でremoveを呼び出したとき第一引数のオブジェクトのvaluesプロパティは省略可能である。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    index: 0,
                    mode: 'remove'
                }, funcs.err);
                expect(funcs.err).not.toHaveBeenCalled();
            });

            it("set関数を呼び出したとき第一引数のオブジェクトのindexプロパティは数字である必要がある。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    values: [val],
                    index: 'test',
                    mode: 'insert'
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数を呼び出したとき第一引数のオブジェクトのindexプロパティは0以上である必要がある。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    values: [val],
                    index: -1,
                    mode: 'insert'
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数を呼び出したとき第一引数のオブジェクトのindexプロパティは現在のデータのlengthまでである必要がある。", function() {
                csbs.observable('test', fs, necKeys).start(funcs.get).set({
                    values: [val],
                    index: testData.length + 1,
                    mode: 'insert'
                }, funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("set関数を呼び出したときsend関数がイベント名とデータを引数として呼び出される。", function() {
                var chkData = {
                    values: [val, val],
                    index: 3,
                    mode: 'insert',
                    id: 5
                };
                var chk = {};
                funcs.send = (function() {
                    return function(eventName, data) {
                        chk = {
                            event: eventName,
                            data: data
                        };
                    };
                })();
                csbs.observable('test', {
                    receive: funcs.receive,
                    send: funcs.send,
                    edit: funcs.edit,
                    remove: funcs.remove,
                    insert: funcs.insert,
                    add: funcs.add
                }, necKeys).start(funcs.get).set({
                    values: [val, val],
                    index: 3,
                    mode: 'insert',
                    id: 5
                }, funcs.err);
                expect(_.isEqual(chkData, chk.data)).toBeTruthy();
                expect(_.isEqual('csbindReceivetest', chk.event)).toBeTruthy();
                expect(funcs.err).not.toHaveBeenCalled();
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

            it("addUpdates関数には引数が必要である。", function() {
                var obs = csbs.observable('test', fs, necKeys).start(funcs.get);

                expect(function() {
                    obs.addUpdates();
                }).toThrow();
            });

            it("addUpdates関数の第一引数は関数の配列である必要がある。", function() {
                var obs = csbs.observable('test', fs, necKeys).start(funcs.get);
                obs.addUpdates([1, 2], funcs.err);
                expect(funcs.err).toHaveBeenCalled();
            });

            it("addUpdates関数の第二引数は関数である必要がある。", function() {
                expect(function() {
                    csbs.observable('test', fs, necKeys).start(funcs.get).addUpdates([funcs.update], 0);
                }).toThrow();
            });

            it("_setReceivedが呼ばれると登録しているupdate関数と_check関数が呼ばれる。", function() {
                var obs = csbs.observable('test', {
                    receive: funcs.receive,
                    send: funcs.send,
                    edit: funcs.edit,
                    remove: funcs.remove,
                    insert: funcs.insert,
                    add: funcs.add
                }, necKeys).start(funcs.get);

                obs.addUpdates([funcs.update, funcs.update]);

                obs.set({
                    values: [val],
                    index: 0,
                    mode: 'insert'
                });
                expect(_.isEqual([val, rval(0), rval(1), rval(2)], chk.newValues)).toBeTruthy();
                expect(_.isEqual({
                    values: [val],
                    index: 0,
                    mode: 'insert'
                }, chk.data)).toBeTruthy();
                expect(funcs.update.calls.count()).toBe(2);
                expect(funcs.send.calls.count()).toBe(1);
            });

            it("_setReceivedが呼ばれても、値に変化がなければ登録しているupdate関数は呼ばれない。", function() {
                var obs = csbs.observable('test', {
                    receive: funcs.receive,
                    send: funcs.send,
                    edit: funcs.edit,
                    remove: funcs.remove,
                    insert: funcs.insert,
                    add: funcs.add
                }, necKeys).start(funcs.get);

                obs.addUpdates([funcs.update, funcs.update]);

                obs.set({
                    values: [],
                    index: 0,
                    mode: 'insert'
                });
                expect(_.isEqual([rval(0), rval(1), rval(2)], obs.get())).toBeTruthy();
                expect(_.isEqual(undefined, chk.newValues)).toBeTruthy();
                expect(_.isEqual(undefined, chk.data)).toBeTruthy();
                expect(funcs.update.calls.count()).toBe(0);
                expect(funcs.send.calls.count()).toBe(0);
            });

            it("set関数でinsertするとき複数の値を挿入できる。", function() {
                var obs = csbs.observable('test', fs, necKeys).start(funcs.get);

                obs.addUpdates([funcs.update, funcs.update]);

                obs.set({
                    values: [val, val],
                    index: 2,
                    mode: 'insert'
                });
                expect(_.isEqual([rval(0), rval(1), val, val, rval(2)], chk.newValues)).toBeTruthy();
                expect(_.isEqual({
                    values: [val, val],
                    index: 2,
                    mode: 'insert'
                }, chk.data)).toBeTruthy();
                expect(_.isEqual([rval(0), rval(1), val, val, rval(2)], obs.get())).toBeTruthy();
                expect(funcs.update.calls.count()).toBe(2);
            });

            it("set関数でaddするとき複数の値を追加できる。", function() {
                var obs = csbs.observable('test', fs, necKeys).start(funcs.get);

                obs.addUpdates([funcs.update, funcs.update]);

                obs.set({
                    values: [val, val],
                    mode: 'add'
                });
                expect(_.isEqual([rval(0), rval(1), rval(2), val, val], chk.newValues)).toBeTruthy();
                expect(_.isEqual({
                    values: [val, val],
                    mode: 'add'
                }, chk.data)).toBeTruthy();
                expect(_.isEqual([rval(0), rval(1), rval(2), val, val], obs.get())).toBeTruthy();
                expect(funcs.update.calls.count()).toBe(2);
            });

            it("set関数でeditするとき複数の値を編集できる。", function() {
                var obs = csbs.observable('test', fs, necKeys).start(funcs.get).addUpdates([funcs.update, funcs.update]).set({
                    values: [val, val],
                    mode: 'edit',
                    index: 1
                });
                expect(_.isEqual([rval(0), val, val], chk.newValues)).toBeTruthy();
                expect(_.isEqual({
                    values: [val, val],
                    mode: 'edit',
                    index: 1
                }, chk.data)).toBeTruthy();
                expect(_.isEqual([rval(0), val, val], obs.get())).toBeTruthy();
                expect(funcs.update.calls.count()).toBe(2);
            });

            it("set関数でremoveすると指定した値を編集できる。", function() {
                var obs = csbs.observable('test', fs, necKeys).start(funcs.get).addUpdates([funcs.update, funcs.update]).set({
                    mode: 'remove',
                    index: 1
                });
                expect(_.isEqual([rval(0), rval(2)], chk.newValues)).toBeTruthy();
                expect(_.isEqual({
                    mode: 'remove',
                    index: 1
                }, chk.data)).toBeTruthy();
                expect(_.isEqual([rval(0), rval(2)], obs.get())).toBeTruthy();
                expect(funcs.update.calls.count()).toBe(2);
            });

            it("_setReceive関数にcheckを送るとき、indexは省略可能である。", function() {
                expect(function() {
                    var obs = csbs.observable('test', {
                        receive: funcs.receive,
                        send: funcs.send,
                        edit: funcs.edit,
                        remove: funcs.remove,
                        insert: funcs.insert,
                        add: funcs.add
                    }, necKeys).start(funcs.get).addUpdates([funcs.update, funcs.update]);
                    socket.emit('test', {
                        values: [val],
                        mode: 'check'
                    });
                }).not.toThrow();
                expect(funcs.update.calls.count()).toBe(0);
                expect(funcs.send.calls.count()).toBe(1);
                expect(funcs.receive.calls.count()).toBe(1);
            });

            it("_setReceive関数にcheckを送るとき、同じ値であればsendは呼ばれない。", function() {
                var obs = csbs.observable('test', {
                    receive: funcs.receive,
                    send: funcs.send,
                    edit: funcs.edit,
                    remove: funcs.remove,
                    insert: funcs.insert,
                    add: funcs.add
                }, necKeys).start(funcs.get).addUpdates([funcs.update, funcs.update]);
                socket.emit('test', {
                    values: testData,
                    mode: 'check'
                });
                expect(funcs.update.calls.count()).toBe(0);
                expect(funcs.send.calls.count()).toBe(0);
                expect(funcs.receive.calls.count()).toBe(1);
            });

        });

    });

});
