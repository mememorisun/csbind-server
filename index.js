'use strict';

//csbindはclientとserverで
//[{},{}...]
//の形式の抽象テーブル型を共有するためのライブラリ
//underscore.jsとunderscore-contrib.jsに依存する。
//
var _ = require('underscore-contrib');
var def = require('deferred');

var csbs = {};

//deepClone
//Date型のみ対応
(function() {
  function _deepClone(obj) {
    var _dc;
    if (!_.isArray(obj)) {
      _dc = {};
      _.each(obj, function(value, key, list) {
        if (!_.isObject(value) || typeof value === 'function') {
          this[key] = value;
        } else if (_.isDate(value)) {
          this[key] = new Date(value.valueOf());
        } else {
          var memo = _deepClone(value);
          this[key] = memo;
        }
      }, _dc);
    } else {
      _dc = _.map(obj, function(value, key, list) {
        if (!_.isObject(value) || typeof value === 'function') {
          if (_.isDate(value)) {
            return new Date(value);
          } else {
            return value;
          }
        }
        var memo = _deepClone(value);
        return memo;
      });
    }
    return _dc;
  }

  function deepClone(obj) {
    if (!_.isObject(obj) || typeof obj === 'function') {
      if (_.isDate(obj)) {
        return new Date(obj);
      } else {
        return obj;
      }
    }
    var dc = _deepClone(obj);
    return dc;
  }
  csbs.deepClone = deepClone;
})();

(function() {

  //util

  /**
   * fail [引数をエラーに格納して投げる関数。]
   * @param  {object} thing [new Errorの引数にできるなら何でもよい。]
   * @return {[type]}     undefined []
   */
  function fail(thing) {
    throw new Error(thing);
  }

  /**
   * validator [validationを生成する関数。戻り値の関数のmessageプロパティにエラーメッセージがセットされる。]
   * @param  {string} message [エラーメッセージ]
   * @param  {function} fun [検証用のpredicate]
   * @return {function} validator [エラーメッセージがセットされたプレディケート]
   */
  function validator(message, fun) {
    var f = function() {
      return fun.apply(fun, arguments);
    };
    f.message = message;
    return f;
  }


  /**
   * hasKeys [オブジェクトが必要なキーを持っているかを判定するpredicateを返す高階関数]
   * @return {function} f [プロパティにエラーメッセージが格納された関数。(validatorの形式に準拠している。)]
   */
  function hasKeys() {
    var keys = _.toArray(arguments);

    var f = function(obj) {
      return _.every(keys, function(k) {
        return _.has(obj, k);
      });
    };

    f.message = _.cat(["以下のキーが存在する必要があります:"], keys).join(" ");
    return f;
  }

  /**
   * hasAnyValue [指定したオブジェクトのプロパティが必要な値かを判定するpredicateを返す高階関数]
   * @param  {string}  prop [プロパティ]
   * @param  {Array}  values [プロパティが持つべき値の配列]
   * @return {function} f [プロパティにエラーメッセージが格納された関数。(validatorの形式に準拠している。)]
   */
  function hasAnyValue(prop, values) {

    var f = function(obj) {
      return _.has(obj, prop) && _.some(values, function(value) {
        return obj[prop] === value;
      });
    };

    f.message = _.cat(['プロパティ' + prop + 'の値は以下のどれかである必要があります:'], values).join(" ");
    return f;
  }

  /**
   * isEveryPredArray [引数のpredにtrueになる配列であることを確かめる関数を返す高階関数。]
   * @param  {string}  message [エラーメッセージ]
   * @param  {function}  pred    [predicate]
   * @return {function}   fun [引数のpredにtrueになる配列であることを確かめる関数]
   */
  function isEveryPredArray(pred) {
    return function(obj) {
      return _.truthy(obj) && _.isArray(obj) && _.every(obj, function(v) {
        return pred(v);
      });
    };
  }

  /**
   * condition [検証関数の配列をセットして、呼び出し時に対応する検証を実行する関数を返す高階関数。(引数例：[val1-1,val1-2],[val2-1,val2-2])]
   * @return {function} con [関数とそれに適応したい引数をとる関数。]
   */
  function condition() {
    var validatorArrays = _.toArray(arguments);

    return function(f) {
      var args = _.rest(arguments);

      var errors = _.mapcat(args, function(arg, index) {

        if (_.exists(validatorArrays[index]) && _.isArray(validatorArrays[index])) return _.mapcat(validatorArrays[index], function(validator) {
          if (!validator(arg)) return [validator.message];
        });
      });

      var err = _.filter(errors, function(x) {
        return _.truthy(x);
      });

      if (err.length !== 0) {
        fail(err.join());
      }

      return f.apply(f, args);

    };
  }

  /**
   * tryDo [try-catch処理を実行する関数を返す高階関数。]
   * @param  {function} f     [関数]
   * @param  {function} errcb [エラーが発生した時に呼ばれるcalback]
   * @return {function}       [try-catch処理を実行する関数。]
   */
  function tryDo(f, errcb) {
    return function() {
      var args = _.toArray(arguments);
      try {
        return f.apply(f, args);
      } catch (e) {
        return _.isFunction(errcb) ? errcb(e) : fail(e);
      }
    };
  }

  /**
   * genPipeline [underscore-contibのpiplelineにoption引数を追加。]
   * @return {funciton} pipeline [登録された関数を逐次実行していく。]
   */
  function genPipeline() {
    var funs = (_.isArray(arguments[0])) ? arguments[0] : arguments;

    return function(seed) {
      var option = _.rest(arguments);
      return _.reduce(funs,
        function(l, r) {
          return r.apply(r, _.cat([l], option));
        },
        seed);
    };
  }

  function eachCall(fArray) {
    var args = _.rest(arguments);
    _.each(fArray, function(f) {
      f.apply(f, args);
    });
  }

  function preIfExist(pre) {
    return function(x) {
      return !_.exists(x) || pre(x);
    };
  }

  function isInRange(v, min, max) {
    return _.isNumber(v) && (min <= v && v <= max);
  }

  function nilGuard(target, def) {
    if (!_.truthy(target)) target = def;
    return target;
  }


  //utilから生成される関数。

  var isRightGetFunction = function(necKeysArray) {
    return function(x) {
      return _.isFunction(x) && isEveryHasKeysArray(csbs.deepClone(x()), necKeysArray);
    };
  };

  var isRightGetFunctionDef = function(necKeysArray) {
    return function(x) {
      return _.isFunction(x) && _.isObject(x()) && _.every(necKeysArray, function(val) {

        return _.exists(x()[val]);

      });
    };
  };

  var isEveryHasKeysArray = function(x, necKeysArray) {
    return (isEveryPredArray(function(y) {
      return _.isObject(y) && hasKeys.apply(hasKeys, necKeysArray)(y);
    })(x));
  };

  var isSeveralHasKeys = function(hkMap, kKey) {
    return function(obj) {
      return _.has(obj, kKey) && _.has(hkMap, obj[kKey]) && hasKeys.apply(hasKeys, hkMap[obj[kKey]])(obj);
    };
  };

  //validator - init

  var validNameInit = validator('第一引数はstring形式である必要があります。', _.isString);

  var validHasKeysInit = hasKeys('receive', 'send', "edit", "insert", "remove", "add");

  var validIsEveryFuncArrayInit = validator('第二引数のハッシュの値は関数である必要があります。',
    function(obj) {
      return _.every(obj, function(value) {
        return _.isFunction(value);
      });
    });　

  var validIsEveryStringArrayInit = validator('第三引数の値は文字列の配列である必要があります。', isEveryPredArray(_.isString));

  var validIsFunctionIfExistInit = validator('第四引数は関数である必要があります。', preIfExist(_.isFunction));


  //validator - start

  var validGenIsRightGetFunStart = function(necKeysArray) {
    return validator('第一引数はオブジェクトの配列(キーとして' + necKeysArray.join(', ') + 'を持つ)を返す関数である必要があります。', isRightGetFunction(necKeysArray));
  };

  var validIsFunIfExistStart = validator('第二引数は関数である必要があります。', preIfExist(_.isFunction));

  //validator - startDef

  var validGenIsRightGetFunStartDef = function(necKeysArray) {
    return validator('第一引数はプロパティとして' + necKeysArray.join(', ') + 'を持つオブジェクトを返す関数である必要があります。', isRightGetFunctionDef(necKeysArray));
  };

  //validator - set

  var validGenHasKeysSet = function(modePropMap, kKey) {
    return validator('第一引数にはmodeプロパティが必要です。またmodeプロパティがedit,insertの時はvalues、indexプロパティ、removeの場合はindexプロパティ、addの場合はvaluesプロパティが追加で必要です。', isSeveralHasKeys(modePropMap, kKey));
  };

  var validGenIsRightIndexSet = function(necModesArray, values) {
    return validator('第一引数のindexプロパティは範囲内の整数である必要があります。', function(x) {
      return !_.contains(necModesArray, x.mode) || isInRange(x.index, 0, values.length);
    });
  };

  var validGenHasAnySet = function(modeKeys) {
    return validator('第一引数のmodeプロパティは' + modeKeys.join() + 'のいずれかである必要があります。', function(x) {
      return hasAnyValue('mode', modeKeys)(x);
    });
  };

  var validGenIsRightValuesSet = function(necKeysArray, necModesArray) {
    return validator('第一引数のvaluesプロパティはオブジェクトの配列(キーとして' + necKeysArray.join(', ') + 'を持つ)である必要があります。',
      function(x) {
        return !_.contains(necModesArray, x.mode) || isEveryHasKeysArray(x.values, necKeysArray);
      });
  };

  var validIsFunIfExistSet = validator('第二引数は関数である必要があります。', preIfExist(_.isFunction));


  //validator - addUpdates

  var validIsEveryFuncArrayAddUpdates = validator('第一引数の値は関数の配列である必要があります。', isEveryPredArray(_.isFunction));

  var validIsFunIfExistAddUpdates = validator('第二引数は関数である必要があります。', preIfExist(_.isFunction));

  //validator - receive



  //pipeline用の関数
  //piplelineではmodeとdataとlastValuesを引数に取りnewValuesを返す。

  var plInsert = function(und, data, funs) {
    if (data.mode === 'insert') {
      funs.insert(data);
    }
  };

  var plEdit = function(und, data, funs) {
    if (data.mode === 'edit') {
      funs.edit(data);
    }
  };

  var plAdd = function(und, data, funs) {
    if (data.mode === 'add') {
      funs.add(data);
    }
  };

  var plRemove = function(und, data, funs) {
    if (data.mode === 'remove') {
      funs.remove(data);
    }
  };

  var plInsertDef = function(promise, data, funs) {
    if (data.mode === 'insert') {
      return funs.insert(data);
    }
    return promise;
  };

  var plEditDef = function(promise, data, funs) {
    if (data.mode === 'edit') {
      return funs.edit(data);
    }
    return promise;
  };

  var plAddDef = function(promise, data, funs) {
    if (data.mode === 'add') {
      return funs.add(data);
    }
    return promise;
  };

  var plRemoveDef = function(promise, data, funs) {
    if (data.mode === 'remove') {
      return funs.remove(data);
    }
    return promise;
  };


  //observable内で使われる関数

  var preInit = condition(
    [validNameInit], [validHasKeysInit, validIsEveryFuncArrayInit], [validIsEveryStringArrayInit], [validIsFunctionIfExistInit]);

  var preStart = function(necKeysArray) {
    return condition(
      [validGenIsRightGetFunStart(necKeysArray)], [], [validIsFunIfExistStart]);
  };

  var preStartDef = function(necKeysArray) {
    return condition(
      [validGenIsRightGetFunStartDef(necKeysArray)], [], [validIsFunIfExistStart]);
  };

  var preSet = function(necKeysArray, modeKeys, modePropMap, values) {
    return condition(
      [validGenHasKeysSet(modePropMap, 'mode'),
        validGenIsRightIndexSet(['insert', 'edit', 'remove'], values),
        validGenHasAnySet(modeKeys),
        validGenIsRightValuesSet(necKeysArray, ['add', 'insert', 'edit'])
      ], [validIsFunIfExistSet]);
  };

  var preAddUpdates = condition(
    [validIsEveryFuncArrayAddUpdates], [validIsFunIfExistAddUpdates]);


  var preReceive = function(necKeysArray, modeKeys, modePropMap, values) {
    return preSet(necKeysArray, modeKeys, modePropMap, values);
  };

  var plReceive = genPipeline(
    plInsert,
    plEdit,
    plRemove,
    plAdd
  );

  var plReceiveDef = genPipeline(
    plInsertDef,
    plEditDef,
    plRemoveDef,
    plAddDef
  );

  /**
   * observable [各処理をセットしobservableを初期化するメソッド。]
   * @param  {string} name [observableごとに固有の名前(サーバーと対応させる必要がある。)]
   * @param  {object} funs [updates・sends・receivesをプロパティに持つobject(各プロパティには関数が登録されている配列を渡す。)]
   * @return {object} obs [各種処理を公開しているobjectを返す。]
   */
  function observable(n, fs, nec, type, errcb) {

    var funs, name, necKeys, baseModeKeys, sendModeKeys, receiveModeKeys, lastValues, returnObj, baseModePropMap, sendModePropMap, receiveModePropMap;

    baseModeKeys = ['insert', 'edit', 'add', 'remove'];

    sendModeKeys = _.cat(baseModeKeys, []);

    receiveModeKeys = _.cat(baseModeKeys, ['check']);

    baseModePropMap = {
      edit: ['index', 'values', 'mode'],
      insert: ['index', 'values', 'mode'],
      remove: ['index', 'mode'],
      add: ['values', 'mode'],
    };

    sendModePropMap = _.merge(baseModePropMap, {});

    receiveModePropMap = _.merge(baseModePropMap, {
      check: ['values', 'mode']
    });

    function _setValues(newValues) {
      if (!_.isEqual(newValues, lastValues)) {
        lastValues = newValues;
        return true;
      } else {
        return false;
      }
    }

    function _getValues() {
      return csbs.deepClone(funs.get());
    }

    function _getValuesDef() {
      var d = def();

      funs.get().then(function(rData) {
        d.resolve(csbs.deepClone(rData));
      });

      return d.promise;
    }

    //初期化処理
    tryDo(function() {
      preInit(function(n, fs, nec, errcb) {
        name = n;
        funs = _.selectKeys(fs, ["receive", "send", "edit", "insert", "remove", "add"]);
        necKeys = _.clone(nec);
      }, n, fs, nec, errcb);
    }, errcb)();

    function _start(get, errcb) {
      tryDo(function() {
        preStart(necKeys)(function(get, errcb) {
          if (_.isFunction(get)) {
            funs.get = csbs.deepClone(get);
            lastValues = csbs.deepClone(get());
          } else {
            lastValues = csbs.deepClone(get);
          }
          funs.receive('csbindSend' + name, _setReceived);
        }, get, errcb);
      }, errcb)();
      return returnObj;
    }

    function _startDef(get, errcb) {
      var d = def();
      tryDo(function() {
        preStartDef(['then'])(function(get, errcb) {
          funs.get = csbs.deepClone(get);
          funs.get().then(function(rData) {
            lastValues = csbs.deepClone(rData);
            funs.receive('csbindSend' + name, _setReceivedDef);
            d.resolve(returnObj);
          });
        }, get, errcb);
      }, errcb)();
      return d.promise;
    }

    function _basicSet(data) {
      if (data.mode !== 'check') {
        plReceive(undefined, data, funs);
        if (_setValues(funs.get())) {
          eachCall(funs.updates, lastValues, data);
          funs.send('csbindReceive' + name, data);
        }
      } else {
        _check(data.values, lastValues);
      }
    }

    function _basicSetDef(data, errcb) {
      var d = def();
      if (data.mode !== 'check') {
        plReceiveDef(null, data, funs)
          .then(function() {
            return tryDo(function() {
              return funs.get();
            }, errcb)();
          })
          .then(function(rData) {
            tryDo(function() {
              if (_setValues(csbs.deepClone(rData))) {
                eachCall(funs.updates, lastValues, data);
                funs.send('csbindReceive' + name, data);
                d.resolve(returnObj);
              } else{
                d.reject(returnObj);
              }
            }, errcb)();
          });
      } else {
        _check(data.values, lastValues);
      }
      return d.promise;
    }

    function _set(data, errcb) {
      tryDo(function() {
        preSet(necKeys, sendModeKeys, sendModePropMap, lastValues)(function(data, errcb) {
          _basicSet(data);
        }, data, errcb);
      }, errcb)();
      return returnObj;
    }

    function _setDef(data, errcb) {
      return tryDo(function() {
        return preSet(necKeys, sendModeKeys, sendModePropMap, lastValues)(function(data, errcb) {
          return _basicSetDef(data, errcb);
        }, data, errcb);
      }, errcb)();
    }

    function _setReceived(data, errcb) {
      tryDo(function() {
        preReceive(necKeys, receiveModeKeys, receiveModePropMap, lastValues)(function(data, errcb) {
          _basicSet(data);
        }, data, errcb);
      }, errcb)();
    }

    function _setReceivedDef(data, errcb) {
      tryDo(function() {
        preReceive(necKeys, receiveModeKeys, receiveModePropMap, lastValues)(function(data, errcb) {
          _basicSetDef(data, errcb);
        }, data, errcb);
      }, errcb)();
    }

    function _addUpdates(fArray, errcb) {
      tryDo(function() {
        preAddUpdates(function(fArray, errcb) {
          funs.updates = _.cat(nilGuard(funs.updates, []), fArray);
        }, fArray, errcb);
      }, errcb)();
      return returnObj;
    }

    function _addUpdatesDef(fArray, errcb) {
      var d = def();
      tryDo(function() {
        preAddUpdates(function(fArray, errcb) {
          funs.updates = _.cat(nilGuard(funs.updates, []), fArray);
        }, fArray, errcb);
      }, errcb)();
      d.resolve(returnObj);
      return d.promise;
    }

    function _check(checkValues, lastValues) {
      if (!_.isEqual(checkValues, lastValues)) {
        funs.send('csbindReceive' + name, {
          values: lastValues,
          mode: 'changeAll'
        });
      }
    }

    returnObj = (function() {
      if (type === 'deferred') {
        return {
          start: _startDef,
          set: _setDef,
          addUpdates: _addUpdatesDef,
          get: _getValuesDef
        };
      } else {
        return {
          start: _start,
          set: _set,
          addUpdates: _addUpdates,
          get: _getValues
        };
      }
    })();

    return returnObj;
  }

  csbs.observable = observable;

})();

module.exports = csbs;
