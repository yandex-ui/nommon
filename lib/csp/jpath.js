
module.exports = function(expr, data) {
    try {
        if (typeof expr === 'object') {
            const keys = Object.keys(expr);
            const len = keys.length;
            const result = {};
            for (let i = 0; i < len; i++) {
                let key = keys[i];
                result[key] = evaluate(expr[key], data, data);
            }
            return result;
        } else {
            return evaluate(expr, data, data);
        }
    } catch (error) {
        throw new Error('Syntax error in "' + expr + '": ' + error);
    }
};


function evaluate(expr, data, rootData) {
    const WEIGHT = {
        '(': 20, ')': 20,
        'U!': 16, 'U~': 16, 'U-': 16, 'U+': 16,
        '*': 14, '/': 14, '%': 14,
        '+': 13, '-': 13,
        '<': 11, '<=': 11, '>': 11, '>=': 11,
        '==': 10, '!=': 10,
        '&&': 6,
        '||': 5
    };

    let cursor = 0;
    const last = expr.length - 1;

    const valStack = [];
    const opStack = [];
    let opOnLastStep = true;

    function pushValue(value) {
        opOnLastStep = false;
        valStack.push(value);
        resolveUnaryOperations();
    }

    function resolveUnaryOperations() {
        while (opStack.length > 0) {
            let op = opStack[ opStack.length - 1 ];
            if (op[0] === 'U') {
                doOperation(op, valStack);
                opStack.pop();
            } else {
                break;
            }
        }
    }

    function pushOperation(operation) {

        if (operation === ')') {
            while (opStack.length > 0) {
                let op = opStack.pop();
                if (op === '(') {
                    break;
                }
                doOperation(op, valStack);
            }
            resolveUnaryOperations();
            return;
        }

        if (operation === '(') {
            opStack.push(operation);

        } else if (opOnLastStep) {
            if (WEIGHT.hasOwnProperty('U' + operation)) {
                operation = 'U' + operation;
            } else {
                throw 'Syntax error in "' + operation + '" operation';
            }
            opStack.push(operation);

        } else {
            let weight = WEIGHT[operation];

            while (opStack.length > 0) {
                let op = opStack[opStack.length - 1];

                if (op !== '(' && op[0] !== 'U' && WEIGHT[op] >= weight) {
                    doOperation(op, valStack);
                    opStack.pop();
                } else {
                    break;
                }
            }
            resolveUnaryOperations();

            opStack.push(operation);
        }

        opOnLastStep = true;
    }


    while(cursor <= last) {

        if (expr[cursor].match(/\s/)) {
            cursor ++;
            continue;
        }

        //
        // Раздер операндов
        //

        if (expr[cursor] === '"') {
            let str = '';
            cursor ++;
            while(cursor <= last && expr[cursor] !== '"') {
                str += expr[cursor];
                if (expr[cursor] === '\\' && expr[cursor + 1] === '"') {
                    cursor ++;
                    str += expr[cursor];
                }
                cursor ++;
            }
            if (cursor > last) {
                throw 'Missing close double quote';
            }
            cursor ++;
            pushValue(str);
            continue;
        }

        if (expr[cursor] === '\'') {
            let str = '';
            cursor ++;
            while(cursor <= last && expr[cursor] !== '\'') {
                str += expr[cursor];
                if (expr[cursor] === '\\' && expr[cursor + 1] === '\'') {
                    cursor ++;
                    str += expr[cursor];
                }
                cursor ++;
            }
            if (cursor > last) {
                throw 'Missing close single quote';
            }
            cursor ++;
            pushValue(str);
            continue;
        }

        if (expr[cursor].match(/[0-9]/)) {
            let num = expr[cursor];

            cursor ++;
            while(cursor <= last && expr[cursor].match(/[0-9.]/)) {
                num += expr[cursor];
                cursor ++;
            }

            pushValue(parseFloat(num));
            continue;
        }

        if (expr[cursor].match(/[./]/)) {
            let selector = expr[cursor];
            cursor ++;

            while(cursor <= last) {
                if (expr[cursor].match(/[a-zA-Z0-9-_.]/)) {
                    selector += expr[cursor];
                    cursor ++;
                    continue;
                }
                if (expr[cursor] === '*' && expr[cursor - 1] === '.') {
                    selector += expr[cursor];
                    cursor ++;
                    continue;
                }
                if (expr[cursor] === '[') {
                    selector += expr[cursor];
                    cursor ++;
                    let depth = 1;
                    while(cursor <= last && depth > 0) {
                        if (expr[cursor] === '[') {
                            depth ++;
                        }
                        if (expr[cursor] === ']') {
                            depth --;
                        }
                        selector += expr[cursor];
                        cursor ++;
                    }

                    if (cursor > last && depth > 0) {
                        throw 'Missing close bracket';
                    }
                    continue;
                }
                break;
            }

            pushValue(select(selector, data, rootData));
            continue;
        }

        //
        // Раздел операций
        //

        let operation = null;

        if (expr[cursor].match(/[<>=!]/)) {
            operation = expr[cursor];
            cursor ++;
            if (expr[cursor] === '=') {
                operation += expr[cursor];
                cursor ++;
            }

        } else if (expr[cursor].match(/[()~+*/%-]/)) {
            operation = expr[cursor];
            cursor ++;

        } else if (expr[cursor].match(/&|/) && expr[cursor + 1] === expr[cursor]) {
            operation = expr[cursor] + expr[cursor + 1];
            cursor += 2;
        }

        if (operation) {
            pushOperation(operation);
            continue;
        }

        throw 'Unknown syntax error';
    }

    while (opStack.length > 0) {
        doOperation(opStack.pop(), valStack);
    }

    if (opStack.length > 0 || valStack.length > 1) {
        throw 'Unknown syntax error';
    }

    return valStack[0];
}


function doOperation(opType, valStack) {
    let result;

    if (opType[0] === 'U') {
        const val = normalizeValueForOp(valStack.pop());

        switch(opType[1]) {
            case '-':
                result = -val;
                break;
            case '!':
                result = !val;
                break;
            case '~':
                result = ~val;
                break;
            case '+':
                result = val;
                break;
            default:
                throw 'Unsupported unary operation "' + opType[1] + '"';
        }
    } else {
        const right = normalizeValueForOp(valStack.pop());
        const left = normalizeValueForOp(valStack.pop());

        switch (opType) {
            case '+':
                result = left + right;
                break;
            case '-':
                result = left - right;
                break;
            case '*':
                result = left * right;
                break;
            case '/':
                result = left / right;
                break;
            case '&&':
                result = left && right;
                break;
            case '||':
                result = left || right;
                break;
            case '<':
                result = left < right;
                break;
            case '<=':
                result = left <= right;
                break;
            case '>':
                result = left > right;
                break;
            case '>=':
                result = left >= right;
                break;
            case '==':
                result = left == right;
                break;
            case '!=':
                result = left != right;
                break;
            default:
                throw 'Unsupported operation "' + opType + '"';
        }
    }

    valStack.push(result);
}

function normalizeValueForOp(value) {
    if (Array.isArray(value)) {
        value = value[0];
    }
    if (typeof value !== 'number' && typeof value !== 'string') {
        value = '';
    }

    return value;
}

function select(expr, data, rootData) {
    let value = data;
    let cursor = 0;
    const last = expr.length - 1;

    // Если мы перешли в работу над множествами
    let multiple = false;

    if (expr[cursor] === '/') {
        value = rootData || value;
        cursor ++;
    }

    while(cursor <= last && typeof value !== 'undefined') {

        // Оператор точка
        if (expr[cursor] === '.') {
            cursor ++;
            let locator = '';

            if (cursor > last) {
                throw 'Syntax error in "." section';
            }
            if (expr[cursor].match(/[a-zA-Z_]/)) {
                locator += expr[cursor];

                cursor ++;
                while(cursor <= last && expr[cursor].match(/[a-zA-Z0-9-_]/)) {
                    locator += expr[cursor];
                    cursor ++;
                }

                multiple = multiple || Array.isArray(value);

                if (!multiple) {
                    value = opDot(value, locator);
                } else {
                    value = forEach(value, opDot, locator);
                }
            }
            continue;
        }

        // Оператор звездочка
        if (expr[cursor] === '*') {
            cursor ++;

            multiple = multiple || Array.isArray(value);

            if (!multiple) {
                value = opAsterics(value);
            } else {
                value = [].concat.apply([], forEach(value, opAsterics));
            }
            continue;
        }

        // Оператор квадратная скобочка
        if (expr[cursor] === '[') {
            cursor ++;

            let sub = '';
            let depth = 1;
            while(cursor <= last && depth > 0) {
                if (expr[cursor] === '[') {
                    depth ++;
                }
                if (expr[cursor] === ']') {
                    depth --;
                    if (depth === 0) {
                        cursor ++;
                        break;
                    }
                }
                sub += expr[cursor];
                cursor ++;
            }

            if (cursor > last && depth > 0) {
                throw 'Missing close bracket';
            }

            sub = sub.trim();

            // Доступ к массиву по индексу
            if (sub.match(/^[0-9]+$/)) {
                if (multiple || !Array.isArray(value)) {
                    value = undefined;
                } else {
                    value = [ value[ parseInt(sub) ] ];
                    multiple = true;
                }
                continue;
            }

            multiple = multiple || Array.isArray(value);

            if (!multiple) {
                value = opBrackets(value, sub);
            } else {
                value = [].concat.apply([], forEach(value, opBrackets, sub, rootData));
            }

            continue;
        }

        throw 'Unknown syntax error';
    }

    return value;
}


function opDot(value, locator) {
    return (value || {})[locator];
}


function opAsterics(value) {
    const result = [];
    if (value) {
        const keys = Object.keys(value);
        const len = keys.length;
        for (let i = 0; i < len; i++) {
            let item = value[keys[i]];
            if (typeof item !== 'undefined') {
                result.push(item);
            }
        }
    }
    return result.length > 0 ? result : undefined;
}


function opBrackets(value, sub, rootData) {
    const filter = evaluate(sub, value, rootData);
    return filter ? value : undefined;
}


function toFlatCollection(value) {
    const collection = value.slice();

    let i = 0;
    while(i < collection.length) {
        let item = collection[i];
        if (Array.isArray(item)) {
            [].splice.apply(collection, [ i, 1 ].concat(item));
        } else {
            i ++;
        }
    }

    return collection;
}


function forEach(value, op /* [, ...args] */ ) {
    const args = [].slice.call(arguments, 2);
    const result = [];

    const collection = toFlatCollection(value);
    const len = collection.length;

    for (let i = 0; i < len; i++) {
        let item = op.apply(this, [ collection[i] ].concat(args));
        if (typeof item !== 'undefined') {
            result.push(item);
        }
    }

    return result.length > 0 ? result : undefined;
}