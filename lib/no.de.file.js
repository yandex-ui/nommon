var no = require('./no.js');

require('./no.events.js');
require('./no.promise.js');

require('./no.de.js');

//  ---------------------------------------------------------------------------------------------------------------  //

var fs_ = require('fs');

//  ---------------------------------------------------------------------------------------------------------------  //

no.de.file = {};

//  ---------------------------------------------------------------------------------------------------------------  //

//  За какими файлами мы уже следим (чтобы не делать повторный watch).
var _watched = {};

//  ---------------------------------------------------------------------------------------------------------------  //

no.de.file.get = function(filename) {
    var promise = new no.Promise();

    fs_.readFile(filename, function(error, content) {
        if (error) {
            promise.reject({
                'id': 'FILE_OPEN_ERROR',
                'message': error.message
            });
        } else {
            promise.resolve(content);
        }
    });

    return promise;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.de.file.load = function(filename, sandbox) {
    var promise = new no.Promise();

    no.de.file.get(filename)
        .then(function(content) {
            var result;

            try {
                result = no.de.eval(content, sandbox, filename);
            } catch (e) {
                promise.reject({
                    id: 'EVAL_ERROR',
                    message: e.message
                });
            }

            promise.resolve(result);
        })
        .else_(function(error) {
            promise.reject(error);
        });

    return promise;
};

//  ---------------------------------------------------------------------------------------------------------------  //

no.de.file.watch = function(type, filename) {
    var isWatched = ( _watched[type] || (( _watched[type] = {} )) )[filename];

    if (!isWatched) {
        _watched[type][filename] = true;

        //  FIXME: Непонятно, как это будет жить, когда файлов будет много.
        fs_.watchFile(filename, function (curr, prev) {
            if ( prev.mtime.getTime() !== curr.mtime.getTime() ) {
                no.events.trigger(type, filename);
            }
        });
    }
};

//  NOTE: Если сделать просто no.de.file.get() и не вызвать no.file.de.unwatch(),
//  то процесс не завершится никогда. Так как будет висеть слушатель изменений файла.
//
no.de.file.unwatch = function(type, filename) {
    if (filename) {
        fs_.unwatchFile(filename);

        var files = _watched[type];
        if (files) {
            //  FIXME: Или лучше удалять ключ совсем?
           files[filename] = false;
        }
    } else {
        if (type) {
            var files = _watched[type];

            for (var filename in files) {
                fs_.unwatchFile(filename);
            }

            _watched[type] = {};
        } else {
            for (type in _watched) {
                no.de.file.unwatch(type);
            }

            _watched = {};
        }
    }
};

//  ---------------------------------------------------------------------------------------------------------------  //

