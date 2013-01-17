var no;
if (typeof window === 'undefined') {
    no = require('./no.js');
} else {
    no = no || {};
}

//  ---------------------------------------------------------------------------------------------------------------  //

//  Простейший pub/sub
//  ------------------
//
//  `no.Events` -- объект, который можно подмиксовать к любому другому объекту:
//
//      var foo = {};
//      no.extend(foo, no.Events);
//
//      foo.on('bar', function(e, data) {
//          console.log(e, data);
//      });
//
//      foo.trigger('bar', 42);
//
//  Или же:
//
//      function Foo() {}
//
//      no.extend(Foo.prototype, no.Events);
//
//      var foo = new Foo();
//
//      foo.on('bar', function(e, data) {
//          console.log(e, data);
//      });
//
//      foo.trigger('bar', 42);
//

//  ---------------------------------------------------------------------------------------------------------------  //

no.Events = {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  Подписываем обработчик handler на событие name.
//
no.Events.on = function(type, handler) {
    var i = type.indexOf(':');
    var ns = type.substr(0, i);
    var name = type.substr(i + 1);

    var all_handlers = this._noevents_handlers || (( this._noevents_handlers = {} ));
    var ns_handlers = all_handlers[ns] || (( all_handlers[ns] = {} ));

    ( ns_handlers[name] || (( ns_handlers[name] = [] )) ).push(handler);
};

//  Отписываем обработчик handler от события name.
//  Если не передать handler, то удалятся вообще все обработчики события name.
//
no.Events.off = function(type, handler) {
    var all_handlers = this._noevents_handlers;
    if (!all_handlers) {
        return;
    }

    var i = type.indexOf(':');
    var ns = type.substr(0, i);
    var name = type.substr(i + 1);

    if (name === '*') {
        //  Не обращаем внимание на наличие или отсутствие handler.
        //  Просто удаляем все обработчики с данным неймспейсом.

        //  FIXME: Или лучше all_handlers[ns] = null?
        delete all_handlers[ns];
        return;
    }

    var ns_handlers = this._noevents_handlers[ns];
    if (!ns_handlers) {
        return;
    }

    if (handler) {
        var handlers = ns_handlers[name];
        if (handlers) {
            //  Ищем этот хэндлер среди уже забинженных обработчиков этого события.
            var i = handlers.indexOf(handler);

            if (i !== -1) {
                //  Нашли и удаляем этот обработчик.
                handlers.splice(i, 1);
            }
        }
    } else {
        //  Удаляем всех обработчиков этого события.
        //  FIXME: Может тут лучше делать ns_handlers[name] = null?
        delete ns_handlers[name];
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  "Генерим" событие name. Т.е. вызываем по-очереди (в порядке подписки) все обработчики события name.
//  В каждый передаем name и params.
//
no.Events.trigger = function(type, params) {
    var i = type.indexOf(':');
    var ns = type.substr(0, i);
    var name = type.substr(i + 1);

    var all_handlers = this._noevents_handlers;
    var ns_handlers = all_handlers && all_handlers[ns];
    var handlers = ns_handlers && ns_handlers[name];

    if (handlers) {
        //  Копируем список хэндлеров.
        //  Если вдруг внутри какого-то обработчика будет вызван `off()`,
        //  то мы не потеряем вызов следующего обработчика.

        //  FIXME: Согласно http://jsperf.com/array-copy/5 копировать массив быстрее через обычный for.
        handlers = handlers.slice();

        for (var i = 0, l = handlers.length; i < l; i++) {
            handlers[i].call(this, type, params);
        }
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

//  "Форвардим" все сообщения name в другой объект.
//
no.Events.forward = function(name, object) {
    this.on(name, function(e, params) {
        object.trigger(e, params);
    });
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.events = no.extend( {}, no.Events );

//  ---------------------------------------------------------------------------------------------------------------  //

