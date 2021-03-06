var test = require('tape');
var postcss = require('postcss');
var plugin = require('./');
var name = require('./package.json').name;

var tests = [
  {
    should: 'scope selectors',
    input: '.foobar {}',
    expected: ':local(.foobar) {}'
  },
  {
    should: 'scope ids',
    input: '#foobar {}',
    expected: ':local(#foobar) {}'
  },
  {
    should: 'scope multiple selectors',
    input: '.foo, .baz {}',
    expected: ':local(.foo), :local(.baz) {}'
  },
  {
    should: 'scope sibling selectors',
    input: '.foo ~ .baz {}',
    expected: ':local(.foo) ~ :local(.baz) {}'
  },
  {
    should: 'scope psuedo elements',
    input: '.foo:after {}',
    expected: ':local(.foo):after {}'
  },
  {
    should: 'scope media queries',
    input: '@media only screen { .foo {} }',
    expected: '@media only screen { :local(.foo) {} }'
  },
  {
    should: 'allow narrow global selectors',
    input: ':global(.foo .bar) {}',
    expected: '.foo .bar {}'
  },
  {
    should: 'allow narrow local selectors',
    input: ':local(.foo .bar) {}',
    expected: ':local(.foo) :local(.bar) {}'
  },
  {
    should: 'allow broad global selectors',
    input: ':global .foo .bar {}',
    expected: '.foo .bar {}'
  },
  {
    should: 'allow broad local selectors',
    input: ':local .foo .bar {}',
    expected: ':local(.foo) :local(.bar) {}'
  },
  {
    should: 'allow multiple narrow global selectors',
    input: ':global(.foo), :global(.bar) {}',
    expected: '.foo, .bar {}'
  },
  {
    should: 'allow multiple broad global selectors',
    input: ':global .foo, :global .bar {}',
    expected: '.foo, .bar {}'
  },
  {
    should: 'allow multiple broad local selectors',
    input: ':local .foo, :local .bar {}',
    expected: ':local(.foo), :local(.bar) {}'
  },
  {
    should: 'allow narrow global selectors nested inside local styles',
    input: '.foo :global(.foo .bar) {}',
    expected: ':local(.foo) .foo .bar {}'
  },
  {
    should: 'allow broad global selectors nested inside local styles',
    input: '.foo :global .foo .bar {}',
    expected: ':local(.foo) .foo .bar {}'
  },
  {
    should: 'allow parentheses inside narrow global selectors',
    input: '.foo :global(.foo:not(.bar)) {}',
    expected: ':local(.foo) .foo:not(.bar) {}'
  },
  {
    should: 'allow parentheses inside narrow local selectors',
    input: '.foo :local(.foo:not(.bar)) {}',
    expected: ':local(.foo) :local(.foo):not(:local(.bar)) {}'
  },
  {
    should: 'allow narrow global selectors appended to local styles',
    input: '.foo:global(.foo.bar) {}',
    expected: ':local(.foo).foo.bar {}'
  },
  {
    should: 'ignore selectors that are already local',
    input: ':local(.foobar) {}',
    expected: ':local(.foobar) {}'
  },
  {
    should: 'ignore nested selectors that are already local',
    input: ':local(.foo) :local(.bar) {}',
    expected: ':local(.foo) :local(.bar) {}'
  },
  {
    should: 'ignore multiple selectors that are already local',
    input: ':local(.foo), :local(.bar) {}',
    expected: ':local(.foo), :local(.bar) {}'
  },
  {
    should: 'ignore sibling selectors that are already local',
    input: ':local(.foo) ~ :local(.bar) {}',
    expected: ':local(.foo) ~ :local(.bar) {}'
  },
  {
    should: 'ignore psuedo elements that are already local',
    input: ':local(.foo):after {}',
    expected: ':local(.foo):after {}'
  },
  {
    should: 'broad global should be limited to selector',
    input: ':global .foo, .bar :global, .foobar :global {}',
    expected: '.foo, :local(.bar), :local(.foobar) {}'
  },
  {
    should: 'broad global should be limited to nested selector',
    input: '.foo:not(:global .bar).foobar {}',
    expected: ':local(.foo):not(.bar):local(.foobar) {}'
  },
  {
    should: 'broad global and local should allow switching',
    input: '.foo :global .bar :local .foobar :local .barfoo {}',
    expected: ':local(.foo) .bar :local(.foobar) :local(.barfoo) {}'
  },
  {
    should: 'localize a single animation-name',
    input: '.foo { animation-name: bar; }',
    expected: ':local(.foo) { animation-name: :local(bar); }'
  },
  {
    should: 'not localize a single animation-delay',
    input: '.foo { animation-delay: 1s; }',
    expected: ':local(.foo) { animation-delay: 1s; }'
  },
  {
    should: 'localize multiple animation-names',
    input: '.foo { animation-name: bar, foobar; }',
    expected: ':local(.foo) { animation-name: :local(bar), :local(foobar); }'
  },
  {
    should: 'localize animation',
    input: '.foo { animation: bar 5s, foobar; }',
    expected: ':local(.foo) { animation: :local(bar) 5s, :local(foobar); }'
  },
  {
    should: 'localize animation with vendor prefix',
    input: '.foo { -webkit-animation: bar; animation: bar; }',
    expected: ':local(.foo) { -webkit-animation: :local(bar); animation: :local(bar); }'
  },
  {
    should: 'not localize other rules',
    input: '.foo { content: "animation: bar;" }',
    expected: ':local(.foo) { content: "animation: bar;" }'
  },
  {
    should: 'not localize global rules',
    input: ':global .foo { animation: foo; animation-name: bar; }',
    expected: '.foo { animation: foo; animation-name: bar; }'
  },
  {
    should: 'handle a complex animation rule',
    input: '.foo { animation: foo, bar 5s linear 2s infinite alternate, barfoo 1s; }',
    expected: ':local(.foo) { animation: :local(foo), :local(bar) 5s linear 2s infinite alternate, :local(barfoo) 1s; }'
  },
  {
    should: 'default to global when mode provided',
    input: '.foo {}',
    options: { mode: 'global' },
    expected: '.foo {}'
  },
  {
    should: 'default to local when mode provided',
    input: '.foo {}',
    options: { mode: 'local' },
    expected: ':local(.foo) {}'
  },
  {
    should: 'use correct spacing',
    input: [
      '.a :local .b {}',
      '.a:local.b {}',
      '.a:local(.b) {}',
      '.a:local( .b ) {}',
      '.a :local(.b) {}',
      '.a :local( .b ) {}',
      ':local(.a).b {}',
      ':local( .a ).b {}',
      ':local(.a) .b {}',
      ':local( .a ) .b {}'
    ].join('\n'),
    options: { mode: 'global' },
    expected: [
      '.a :local(.b) {}',
      '.a:local(.b) {}',
      '.a:local(.b) {}',
      '.a:local(.b) {}',
      '.a :local(.b) {}',
      '.a :local(.b) {}',
      ':local(.a).b {}',
      ':local(.a).b {}',
      ':local(.a) .b {}',
      ':local(.a) .b {}'
    ].join('\n')
  },
  {
    should: 'localize keyframes',
    input: '@keyframes foo { from { color: red; } to { color: blue; } }',
    expected: '@keyframes :local(foo) { from { color: red; } to { color: blue; } }'
  },
  {
    should: 'localize keyframes in global default mode',
    input: '@keyframes foo {}',
    options: { mode: 'global' },
    expected: '@keyframes foo {}'
  },
  {
    should: 'localize explicit keyframes',
    input: '@keyframes :local(foo) { 0% { color: red; } 33.3% { color: yellow; } 100% { color: blue; } } @-webkit-keyframes :global(bar) { from { color: red; } to { color: blue; } }',
    expected: '@keyframes :local(foo) { 0% { color: red; } 33.3% { color: yellow; } 100% { color: blue; } } @-webkit-keyframes bar { from { color: red; } to { color: blue; } }'
  },
  {
    should: 'ignore :export statements',
    input: ':export { foo: __foo; }',
    expected: ':export { foo: __foo; }'
  },
  {
    should: 'ignore :import statemtents',
    input: ':import("~/lol.css") { foo: __foo; }',
    expected: ':import("~/lol.css") { foo: __foo; }'
  },
  {
    should: 'compile in pure mode',
    input: ':global(.foo).bar, [type="radio"] ~ .label, :not(.foo), #bar {}',
    options: { mode: 'pure' },
    expected: '.foo:local(.bar), [type="radio"] ~ :local(.label), :not(:local(.foo)), :local(#bar) {}'
  },
  {
    should: 'compile explict global element',
    input: ':global(input) {}',
    expected: 'input {}'
  },
  {
    should: 'compile explict global attribute',
    input: ':global([type="radio"]), :not(:global [type="radio"]) {}',
    expected: '[type="radio"], :not([type="radio"]) {}'
  },

  {
    should: 'throw on invalid mode',
    input: '',
    options: { mode: '???' },
    error: /"global", "local" or "pure"/
  },
  {
    should: 'throw on inconsistent selector result',
    input: ':global .foo, .bar {}',
    error: /Inconsistent/
  },
  {
    should: 'throw on nested :locals',
    input: ':local(:local(.foo)) {}',
    error: /is not allowed inside/
  },
  {
    should: 'throw on nested :globals',
    input: ':global(:global(.foo)) {}',
    error: /is not allowed inside/
  },
  {
    should: 'throw on nested mixed',
    input: ':local(:global(.foo)) {}',
    error: /is not allowed inside/
  },
  {
    should: 'throw on nested broad :local',
    input: ':global(:local .foo) {}',
    error: /is not allowed inside/
  },
  {
    should: 'throw on incorrect spacing with broad :global',
    input: '.foo :global.bar {}',
    error: /Missing whitespace after :global/
  },
  {
    should: 'throw on incorrect spacing with broad :local',
    input: '.foo:local .bar {}',
    error: /Missing whitespace before :local/
  },
  {
    should: 'throw on not pure selector (global class)',
    input: ':global(.foo) {}',
    options: { mode: 'pure' },
    error: /":global\(\.foo\)" is not pure/
  },
  {
    should: 'throw on not pure selector (with multiple 1)',
    input: '.foo, :global(.bar) {}',
    options: { mode: 'pure' },
    error: /".foo, :global\(\.bar\)" is not pure/
  },
  {
    should: 'throw on not pure selector (with multiple 2)',
    input: ':global(.bar), .foo {}',
    options: { mode: 'pure' },
    error: /":global\(\.bar\), .foo" is not pure/
  },
  {
    should: 'throw on not pure selector (element)',
    input: 'input {}',
    options: { mode: 'pure' },
    error: /"input" is not pure/
  },
  {
    should: 'throw on not pure selector (attribute)',
    input: '[type="radio"] {}',
    options: { mode: 'pure' },
    error: /"\[type="radio"\]" is not pure/
  },
  {
    should: 'throw on not pure keyframes',
    input: '@keyframes :global(foo) {}',
    options: { mode: 'pure' },
    error: /@keyframes :global\(\.\.\.\) is not allowed in pure mode/
  },
  {
    should: 'pass through global element',
    input: 'input {}',
    expected: 'input {}'
  },
  {
    should: 'localise class and pass through element',
    input: '.foo input {}',
    expected: ':local(.foo) input {}'
  },
  {
    should: 'pass through attribute selector',
    input: '[type="radio"] {}',
    expected: '[type="radio"] {}'
  },
  {
    should: 'not modify urls without option',
    input: '.a { background: url(./image.png); }\n' +
      ':global .b { background: url(image.png); }\n' +
      '.c { background: url("./image.png"); }',
    expected: ':local(.a) { background: url(./image.png); }\n' +
      '.b { background: url(image.png); }\n' +
      ':local(.c) { background: url("./image.png"); }'
  },
  {
    should: 'rewrite url in local block',
    input: '.a { background: url(./image.png); }\n' +
      ':global .b { background: url(image.png); }\n' +
      '.c { background: url("./image.png"); }\n' +
      '.d { background: -webkit-image-set(url("./image.png") 1x, url("./image2x.png") 2x); }\n' +
      '@font-face { src: url("./font.woff"); }\n' +
      '@-webkit-font-face { src: url("./font.woff"); }\n' +
      '@media screen { .a { src: url("./image.png"); } }\n' +
      '@keyframes :global(ani1) { 0% { src: url("image.png"); } }\n' +
      '@keyframes ani2 { 0% { src: url("./image.png"); } }',
    options: {
      rewriteUrl: function(global, url) {
        var mode = global ? 'global' : 'local';
        return '(' + mode + ')' + url + '"' + mode + '"';
      }
    },
    expected: ':local(.a) { background: url((local\\)./image.png\\\"local\\\"); }\n' +
      '.b { background: url((global\\)image.png\\\"global\\\"); }\n' +
      ':local(.c) { background: url(\"(local)./image.png\\\"local\\\"\"); }\n' +
      ':local(.d) { background: -webkit-image-set(url(\"(local)./image.png\\\"local\\\"\") 1x, url(\"(local)./image2x.png\\\"local\\\"\") 2x); }\n' +
      '@font-face { src: url(\"(local)./font.woff\\\"local\\\"\"); }\n' +
      '@-webkit-font-face { src: url(\"(local)./font.woff\\\"local\\\"\"); }\n' +
      '@media screen { :local(.a) { src: url("(local)./image.png\\"local\\""); } }\n' +
      '@keyframes ani1 { 0% { src: url("(global)image.png\\"global\\""); } }\n' +
      '@keyframes :local(ani2) { 0% { src: url("(local)./image.png\\"local\\""); } }'
  },
  {
    should: 'not crash on atrule without nodes',
    input: '@charset "utf-8";',
    expected: '@charset "utf-8";'
  }

];

function process (css, options) {
    return postcss(plugin(options)).process(css).css;
}

test(name, function (t) {
    t.plan(tests.length);

    tests.forEach(function (testCase) {
        var options = testCase.options;
        if(testCase.error) {
          t.throws(function() {
            process(testCase.input, options);
          }, testCase.error, 'should ' + testCase.should);
        } else {
          t.equal(process(testCase.input, options), testCase.expected, 'should ' + testCase.should);
        }
    });
});


test('should use the postcss plugin api', function (t) {
    t.plan(2);
    t.ok(plugin().postcssVersion, 'should be able to access version');
    t.equal(plugin().postcssPlugin, name, 'should be able to access name');
});
