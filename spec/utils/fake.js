'use strict';

var csbs = require("../../index");

var fake = (function() {
    var recipeData, fakeIdSerial, makeFakeId, mockSio,setCheckValue,checkValue;

    fakeIdSerial = 6;

    makeFakeId = function() {
        return 'rid' + String(fakeIdSerial++);
    };

    mockSio = (function() {
        var
            on_sio, emit_sio, rval,
            callback_map = {};

        rval = function(x) {
            return csbs.deepClone({
                content: "chat" + x,
                author: "author" + x,
                date: new Date(2014, 10, x)
            });
        };

        setCheckValue =function(chkvalue){
          checkValue = chkvalue;
        };

        on_sio = function(msg_type, callback) {
            callback_map[msg_type] = callback;
        };

        emit_sio = function(msg_type, data) {
            var person_map, i;

            if (msg_type === 'test' && callback_map.csbindSendtest) {
                callback_map.csbindSendtest(data);
            }

            if (msg_type === 'csbindReceivetest' && callback_map.csbindSendtest) {
                callback_map.csbindSendtest({
                    mode: 'check',
                    values: checkValue
                });
            }

        };

        return {
            emit: emit_sio,
            on: on_sio,
            setc: setCheckValue,
        };
    }());

    return {
        mockSio: mockSio
    };
}());

module.exports = fake;
