var no = require('../lib');

var should = require('should');

var events = no.extend( {}, no.Events );

//  ---------------------------------------------------------------------------------------------------------------  //

it('on #1', function() {
    var n = 0;
    var results = [];

    events.on('foo', function(e, r) {
        results.push(r);
        n++;
    });

    events.trigger('foo', 42);
    events.trigger('foo', 24);
    events.trigger('foo', 66);

    results.should.be.eql( [ 42, 24, 66 ] );
    n.should.be.eql(3);
});

//  ---------------------------------------------------------------------------------------------------------------  //

it('on #2', function() {
    var n = 0;

    events.on('foo', function(e, r) {
        n++;
    });

    events.trigger('bar', 42);
    events.trigger('bar', 24);

    n.should.be.eql(0);
});

//  ---------------------------------------------------------------------------------------------------------------  //

it('on #3', function() {
    var n = 0;
    var results = [];

    events.on('foo', function(e, r) {
        results.push(r);
        n++;
    });

    events.on('foo', function(e, r) {
        results.push(r);
        n++;
    });

    events.trigger('foo', 42);
    events.trigger('foo', 24);
    events.trigger('foo', 66);

    results.should.be.eql( [ 42, 42, 24, 24, 66, 66 ] );
    n.should.be.eql(6);
});

//  ---------------------------------------------------------------------------------------------------------------  //

it('on #4', function() {
    var n = 0;
    var m = 0;
    var results = [];

    events.on('foo', function(e, r) {
        results.push(r);
        n++;
    });

    events.on('bar', function(e, r) {
        results.push(r);
        m++;
    });

    events.trigger('foo', 42);
    events.trigger('foo', 24);
    events.trigger('bar', 66);
    events.trigger('foo', 37);

    n.should.be.eql(3);
    m.should.be.eql(1);
    results.should.be.eql( [ 42, 24, 66, 37 ] );

});

//  ---------------------------------------------------------------------------------------------------------------  //

it('off #1', function() {
    var n = 0;

    events.on('foo', function(e, r) {
        n++;
    });

    events.trigger('foo');
    events.trigger('foo');
    events.off('foo');
    events.trigger('foo');

    n.should.be.eql(2);
});

//  ---------------------------------------------------------------------------------------------------------------  //

it('off #2', function() {
    var n = 0;
    var results = [];

    var h1 = function(e, r) {
        n++;
        results.push(r + 10);
    };
    var h2 = function(e, r) {
        n++;
        results.push(r - 10);
    };

    events.on('foo', h1);
    events.on('foo', h2);

    events.trigger('foo', 42);
    events.trigger('foo', 24);
    events.off('foo', h2);
    events.trigger('foo', 66);

    n.should.be.eql(5);
    results.should.be.eql( [ 52, 32, 34, 14, 76 ] );
});

//  ---------------------------------------------------------------------------------------------------------------  //

it('off #3', function() {
    var n = 0;
    var results = [];

    var h1 = function(e, r) {
        n++;
        results.push(r + 10);
    };
    var h2 = function(e, r) {
        n++;
        results.push(r - 10);
    };

    events.on('foo', h1);
    events.on('foo', h2);

    events.trigger('foo', 42);
    events.trigger('foo', 24);
    events.off('foo');
    events.trigger('foo', 66);

    n.should.be.eql(4);
    results.should.be.eql( [ 52, 32, 34, 14 ] );
});

//  ---------------------------------------------------------------------------------------------------------------  //

it('off #3', function() {
    var n = 0;

    events.on('foo', function() {
        n++;
        events.off('foo');
    });

    events.on('foo', function() {
        n++;
    });

    events.on('foo', function() {
        n++;
    });

    events.trigger('foo');

    n.should.be.eql(3);

    events.trigger('foo');

    n.should.be.eql(3);
});

//  ---------------------------------------------------------------------------------------------------------------  //

