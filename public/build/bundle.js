
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/Header.svelte generated by Svelte v3.59.2 */

    const file$5 = "src/components/Header.svelte";

    function create_fragment$5(ctx) {
    	let header;
    	let div2;
    	let div1;
    	let div0;
    	let t1;
    	let nav;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let button2;
    	let t7;
    	let button3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			header = element("header");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "💧 Mediagua - Serviço de Medição de Água";
    			t1 = space();
    			nav = element("nav");
    			button0 = element("button");
    			button0.textContent = "📊 Dashboard";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "📝 Nova Medição";
    			t5 = space();
    			button2 = element("button");
    			button2.textContent = "📋 Histórico";
    			t7 = space();
    			button3 = element("button");
    			button3.textContent = "📈 Relatórios";
    			attr_dev(div0, "class", "logo");
    			add_location(div0, file$5, 8, 3, 149);
    			attr_dev(button0, "class", "nav-link svelte-vwyq6m");
    			toggle_class(button0, "active", /*currentView*/ ctx[0] === 'dashboard');
    			add_location(button0, file$5, 13, 4, 252);
    			attr_dev(button1, "class", "nav-link svelte-vwyq6m");
    			toggle_class(button1, "active", /*currentView*/ ctx[0] === 'measurement');
    			add_location(button1, file$5, 20, 4, 417);
    			attr_dev(button2, "class", "nav-link svelte-vwyq6m");
    			toggle_class(button2, "active", /*currentView*/ ctx[0] === 'history');
    			add_location(button2, file$5, 27, 4, 589);
    			attr_dev(button3, "class", "nav-link svelte-vwyq6m");
    			toggle_class(button3, "active", /*currentView*/ ctx[0] === 'reports');
    			add_location(button3, file$5, 34, 4, 750);
    			attr_dev(nav, "class", "nav");
    			add_location(nav, file$5, 12, 3, 230);
    			attr_dev(div1, "class", "header-content");
    			add_location(div1, file$5, 7, 2, 117);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$5, 6, 1, 91);
    			attr_dev(header, "class", "header");
    			add_location(header, file$5, 5, 0, 66);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t1);
    			append_dev(div1, nav);
    			append_dev(nav, button0);
    			append_dev(nav, t3);
    			append_dev(nav, button1);
    			append_dev(nav, t5);
    			append_dev(nav, button2);
    			append_dev(nav, t7);
    			append_dev(nav, button3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[2], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[3], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[4], false, false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[5], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentView*/ 1) {
    				toggle_class(button0, "active", /*currentView*/ ctx[0] === 'dashboard');
    			}

    			if (dirty & /*currentView*/ 1) {
    				toggle_class(button1, "active", /*currentView*/ ctx[0] === 'measurement');
    			}

    			if (dirty & /*currentView*/ 1) {
    				toggle_class(button2, "active", /*currentView*/ ctx[0] === 'history');
    			}

    			if (dirty & /*currentView*/ 1) {
    				toggle_class(button3, "active", /*currentView*/ ctx[0] === 'reports');
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	let { currentView } = $$props;
    	let { setView } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (currentView === undefined && !('currentView' in $$props || $$self.$$.bound[$$self.$$.props['currentView']])) {
    			console.warn("<Header> was created without expected prop 'currentView'");
    		}

    		if (setView === undefined && !('setView' in $$props || $$self.$$.bound[$$self.$$.props['setView']])) {
    			console.warn("<Header> was created without expected prop 'setView'");
    		}
    	});

    	const writable_props = ['currentView', 'setView'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => setView('dashboard');
    	const click_handler_1 = () => setView('measurement');
    	const click_handler_2 = () => setView('history');
    	const click_handler_3 = () => setView('reports');

    	$$self.$$set = $$props => {
    		if ('currentView' in $$props) $$invalidate(0, currentView = $$props.currentView);
    		if ('setView' in $$props) $$invalidate(1, setView = $$props.setView);
    	};

    	$$self.$capture_state = () => ({ currentView, setView });

    	$$self.$inject_state = $$props => {
    		if ('currentView' in $$props) $$invalidate(0, currentView = $$props.currentView);
    		if ('setView' in $$props) $$invalidate(1, setView = $$props.setView);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		currentView,
    		setView,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { currentView: 0, setView: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get currentView() {
    		throw new Error("<Header>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentView(value) {
    		throw new Error("<Header>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setView() {
    		throw new Error("<Header>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set setView(value) {
    		throw new Error("<Header>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Dashboard.svelte generated by Svelte v3.59.2 */

    const file$4 = "src/components/Dashboard.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (34:4) {:else}
    function create_else_block_2$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("0");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2$1.name,
    		type: "else",
    		source: "(34:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (32:4) {#if lastMeasurement}
    function create_if_block_3$3(ctx) {
    	let t_value = /*lastMeasurement*/ ctx[3].consumption.toFixed(1) + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*lastMeasurement*/ 8 && t_value !== (t_value = /*lastMeasurement*/ ctx[3].consumption.toFixed(1) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$3.name,
    		type: "if",
    		source: "(32:4) {#if lastMeasurement}",
    		ctx
    	});

    	return block;
    }

    // (51:2) {:else}
    function create_else_block$2(ctx) {
    	let div;
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;
    	let t5;
    	let th3;
    	let t7;
    	let tbody;
    	let each_value = /*recentMeasurements*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Data";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "Hidrômetro";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "Consumo (L)";
    			t5 = space();
    			th3 = element("th");
    			th3.textContent = "Status";
    			t7 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(th0, file$4, 55, 7, 1397);
    			add_location(th1, file$4, 56, 7, 1418);
    			add_location(th2, file$4, 57, 7, 1445);
    			add_location(th3, file$4, 58, 7, 1473);
    			add_location(tr, file$4, 54, 6, 1385);
    			add_location(thead, file$4, 53, 5, 1371);
    			add_location(tbody, file$4, 61, 5, 1520);
    			attr_dev(table, "class", "table");
    			add_location(table, file$4, 52, 4, 1344);
    			attr_dev(div, "class", "table-container svelte-5ipuca");
    			add_location(div, file$4, 51, 3, 1310);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, table);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t1);
    			append_dev(tr, th1);
    			append_dev(tr, t3);
    			append_dev(tr, th2);
    			append_dev(tr, t5);
    			append_dev(tr, th3);
    			append_dev(table, t7);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(tbody, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*recentMeasurements, averageConsumption, Date*/ 20) {
    				each_value = /*recentMeasurements*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(51:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (46:2) {#if recentMeasurements.length === 0}
    function create_if_block$3(ctx) {
    	let div;
    	let p0;
    	let t1;
    	let p1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			p0 = element("p");
    			p0.textContent = "Nenhuma medição registrada ainda.";
    			t1 = space();
    			p1 = element("p");
    			p1.textContent = "Clique em \"Nova Medição\" para começar!";
    			attr_dev(p0, "class", "mb-3");
    			add_location(p0, file$4, 47, 4, 1183);
    			add_location(p1, file$4, 48, 4, 1241);
    			attr_dev(div, "class", "text-center");
    			add_location(div, file$4, 46, 3, 1153);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, p0);
    			append_dev(div, t1);
    			append_dev(div, p1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(46:2) {#if recentMeasurements.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (74:10) {:else}
    function create_else_block_1$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Moderado");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$2.name,
    		type: "else",
    		source: "(74:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (72:71) 
    function create_if_block_2$3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Alto");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(72:71) ",
    		ctx
    	});

    	return block;
    }

    // (70:10) {#if measurement.consumption <= averageConsumption}
    function create_if_block_1$3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Normal");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(70:10) {#if measurement.consumption <= averageConsumption}",
    		ctx
    	});

    	return block;
    }

    // (63:6) {#each recentMeasurements as measurement}
    function create_each_block$2(ctx) {
    	let tr;
    	let td0;
    	let t0_value = new Date(/*measurement*/ ctx[8].date).toLocaleDateString('pt-BR') + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*measurement*/ ctx[8].meterNumber + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*measurement*/ ctx[8].consumption.toFixed(1) + "";
    	let t4;
    	let t5;
    	let td3;
    	let span;
    	let t6;

    	function select_block_type_2(ctx, dirty) {
    		if (/*measurement*/ ctx[8].consumption <= /*averageConsumption*/ ctx[2]) return create_if_block_1$3;
    		if (/*measurement*/ ctx[8].consumption > /*averageConsumption*/ ctx[2] * 1.5) return create_if_block_2$3;
    		return create_else_block_1$2;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			span = element("span");
    			if_block.c();
    			t6 = space();
    			add_location(td0, file$4, 64, 8, 1596);
    			add_location(td1, file$4, 65, 8, 1670);
    			add_location(td2, file$4, 66, 8, 1713);
    			attr_dev(span, "class", "badge svelte-5ipuca");
    			toggle_class(span, "success", /*measurement*/ ctx[8].consumption <= /*averageConsumption*/ ctx[2]);
    			toggle_class(span, "danger", /*measurement*/ ctx[8].consumption > /*averageConsumption*/ ctx[2] * 1.5);
    			add_location(span, file$4, 68, 9, 1781);
    			add_location(td3, file$4, 67, 8, 1767);
    			add_location(tr, file$4, 63, 7, 1583);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			append_dev(td3, span);
    			if_block.m(span, null);
    			append_dev(tr, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*recentMeasurements*/ 16 && t0_value !== (t0_value = new Date(/*measurement*/ ctx[8].date).toLocaleDateString('pt-BR') + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*recentMeasurements*/ 16 && t2_value !== (t2_value = /*measurement*/ ctx[8].meterNumber + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*recentMeasurements*/ 16 && t4_value !== (t4_value = /*measurement*/ ctx[8].consumption.toFixed(1) + "")) set_data_dev(t4, t4_value);

    			if (current_block_type !== (current_block_type = select_block_type_2(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}

    			if (dirty & /*recentMeasurements, averageConsumption*/ 20) {
    				toggle_class(span, "success", /*measurement*/ ctx[8].consumption <= /*averageConsumption*/ ctx[2]);
    			}

    			if (dirty & /*recentMeasurements, averageConsumption*/ 20) {
    				toggle_class(span, "danger", /*measurement*/ ctx[8].consumption > /*averageConsumption*/ ctx[2] * 1.5);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(63:6) {#each recentMeasurements as measurement}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div16;
    	let h1;
    	let t1;
    	let div12;
    	let div2;
    	let div0;
    	let t2_value = /*measurements*/ ctx[0].length + "";
    	let t2;
    	let t3;
    	let div1;
    	let t5;
    	let div5;
    	let div3;
    	let t6_value = /*totalConsumption*/ ctx[1].toFixed(1) + "";
    	let t6;
    	let t7;
    	let div4;
    	let t9;
    	let div8;
    	let div6;
    	let t10_value = /*averageConsumption*/ ctx[2].toFixed(1) + "";
    	let t10;
    	let t11;
    	let div7;
    	let t13;
    	let div11;
    	let div9;
    	let t14;
    	let div10;
    	let t16;
    	let div13;
    	let h20;
    	let t18;
    	let t19;
    	let div15;
    	let h21;
    	let t21;
    	let div14;
    	let button0;
    	let t23;
    	let button1;
    	let t25;
    	let button2;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*lastMeasurement*/ ctx[3]) return create_if_block_3$3;
    		return create_else_block_2$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*recentMeasurements*/ ctx[4].length === 0) return create_if_block$3;
    		return create_else_block$2;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			div16 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Dashboard - Medição de Água";
    			t1 = space();
    			div12 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			div1 = element("div");
    			div1.textContent = "Total de Medições";
    			t5 = space();
    			div5 = element("div");
    			div3 = element("div");
    			t6 = text(t6_value);
    			t7 = space();
    			div4 = element("div");
    			div4.textContent = "Consumo Total (L)";
    			t9 = space();
    			div8 = element("div");
    			div6 = element("div");
    			t10 = text(t10_value);
    			t11 = space();
    			div7 = element("div");
    			div7.textContent = "Média de Consumo (L)";
    			t13 = space();
    			div11 = element("div");
    			div9 = element("div");
    			if_block0.c();
    			t14 = space();
    			div10 = element("div");
    			div10.textContent = "Última Medição (L)";
    			t16 = space();
    			div13 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Medições Recentes";
    			t18 = space();
    			if_block1.c();
    			t19 = space();
    			div15 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Ações Rápidas";
    			t21 = space();
    			div14 = element("div");
    			button0 = element("button");
    			button0.textContent = "📝 Nova Medição";
    			t23 = space();
    			button1 = element("button");
    			button1.textContent = "📋 Ver Histórico";
    			t25 = space();
    			button2 = element("button");
    			button2.textContent = "📈 Gerar Relatório";
    			attr_dev(h1, "class", "mb-4");
    			add_location(h1, file$4, 10, 1, 222);
    			attr_dev(div0, "class", "stat-value");
    			add_location(div0, file$4, 15, 3, 356);
    			attr_dev(div1, "class", "stat-label");
    			add_location(div1, file$4, 16, 3, 411);
    			attr_dev(div2, "class", "stat-card");
    			add_location(div2, file$4, 14, 2, 329);
    			attr_dev(div3, "class", "stat-value");
    			add_location(div3, file$4, 20, 3, 500);
    			attr_dev(div4, "class", "stat-label");
    			add_location(div4, file$4, 21, 3, 563);
    			attr_dev(div5, "class", "stat-card");
    			add_location(div5, file$4, 19, 2, 473);
    			attr_dev(div6, "class", "stat-value");
    			add_location(div6, file$4, 25, 3, 652);
    			attr_dev(div7, "class", "stat-label");
    			add_location(div7, file$4, 26, 3, 717);
    			attr_dev(div8, "class", "stat-card");
    			add_location(div8, file$4, 24, 2, 625);
    			attr_dev(div9, "class", "stat-value");
    			add_location(div9, file$4, 30, 3, 809);
    			attr_dev(div10, "class", "stat-label");
    			add_location(div10, file$4, 37, 3, 948);
    			attr_dev(div11, "class", "stat-card");
    			add_location(div11, file$4, 29, 2, 782);
    			attr_dev(div12, "class", "stats-grid");
    			add_location(div12, file$4, 13, 1, 302);
    			attr_dev(h20, "class", "mb-3");
    			add_location(h20, file$4, 43, 2, 1067);
    			attr_dev(div13, "class", "card");
    			add_location(div13, file$4, 42, 1, 1046);
    			attr_dev(h21, "class", "mb-3");
    			add_location(h21, file$4, 88, 2, 2310);
    			attr_dev(button0, "class", "btn");
    			add_location(button0, file$4, 90, 3, 2377);
    			attr_dev(button1, "class", "btn btn-secondary");
    			add_location(button1, file$4, 93, 3, 2489);
    			attr_dev(button2, "class", "btn btn-secondary");
    			add_location(button2, file$4, 96, 3, 2612);
    			attr_dev(div14, "class", "grid grid-3");
    			add_location(div14, file$4, 89, 2, 2348);
    			attr_dev(div15, "class", "card");
    			add_location(div15, file$4, 87, 1, 2289);
    			attr_dev(div16, "class", "dashboard svelte-5ipuca");
    			add_location(div16, file$4, 9, 0, 197);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div16, anchor);
    			append_dev(div16, h1);
    			append_dev(div16, t1);
    			append_dev(div16, div12);
    			append_dev(div12, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div12, t5);
    			append_dev(div12, div5);
    			append_dev(div5, div3);
    			append_dev(div3, t6);
    			append_dev(div5, t7);
    			append_dev(div5, div4);
    			append_dev(div12, t9);
    			append_dev(div12, div8);
    			append_dev(div8, div6);
    			append_dev(div6, t10);
    			append_dev(div8, t11);
    			append_dev(div8, div7);
    			append_dev(div12, t13);
    			append_dev(div12, div11);
    			append_dev(div11, div9);
    			if_block0.m(div9, null);
    			append_dev(div11, t14);
    			append_dev(div11, div10);
    			append_dev(div16, t16);
    			append_dev(div16, div13);
    			append_dev(div13, h20);
    			append_dev(div13, t18);
    			if_block1.m(div13, null);
    			append_dev(div16, t19);
    			append_dev(div16, div15);
    			append_dev(div15, h21);
    			append_dev(div15, t21);
    			append_dev(div15, div14);
    			append_dev(div14, button0);
    			append_dev(div14, t23);
    			append_dev(div14, button1);
    			append_dev(div14, t25);
    			append_dev(div14, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[5], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[6], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[7], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*measurements*/ 1 && t2_value !== (t2_value = /*measurements*/ ctx[0].length + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*totalConsumption*/ 2 && t6_value !== (t6_value = /*totalConsumption*/ ctx[1].toFixed(1) + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*averageConsumption*/ 4 && t10_value !== (t10_value = /*averageConsumption*/ ctx[2].toFixed(1) + "")) set_data_dev(t10, t10_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div9, null);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div13, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div16);
    			if_block0.d();
    			if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let recentMeasurements;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Dashboard', slots, []);
    	let { measurements } = $$props;
    	let { totalConsumption } = $$props;
    	let { averageConsumption } = $$props;
    	let { lastMeasurement } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (measurements === undefined && !('measurements' in $$props || $$self.$$.bound[$$self.$$.props['measurements']])) {
    			console.warn("<Dashboard> was created without expected prop 'measurements'");
    		}

    		if (totalConsumption === undefined && !('totalConsumption' in $$props || $$self.$$.bound[$$self.$$.props['totalConsumption']])) {
    			console.warn("<Dashboard> was created without expected prop 'totalConsumption'");
    		}

    		if (averageConsumption === undefined && !('averageConsumption' in $$props || $$self.$$.bound[$$self.$$.props['averageConsumption']])) {
    			console.warn("<Dashboard> was created without expected prop 'averageConsumption'");
    		}

    		if (lastMeasurement === undefined && !('lastMeasurement' in $$props || $$self.$$.bound[$$self.$$.props['lastMeasurement']])) {
    			console.warn("<Dashboard> was created without expected prop 'lastMeasurement'");
    		}
    	});

    	const writable_props = ['measurements', 'totalConsumption', 'averageConsumption', 'lastMeasurement'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Dashboard> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => window.location.hash = '#measurement';
    	const click_handler_1 = () => window.location.hash = '#history';
    	const click_handler_2 = () => window.location.hash = '#reports';

    	$$self.$$set = $$props => {
    		if ('measurements' in $$props) $$invalidate(0, measurements = $$props.measurements);
    		if ('totalConsumption' in $$props) $$invalidate(1, totalConsumption = $$props.totalConsumption);
    		if ('averageConsumption' in $$props) $$invalidate(2, averageConsumption = $$props.averageConsumption);
    		if ('lastMeasurement' in $$props) $$invalidate(3, lastMeasurement = $$props.lastMeasurement);
    	};

    	$$self.$capture_state = () => ({
    		measurements,
    		totalConsumption,
    		averageConsumption,
    		lastMeasurement,
    		recentMeasurements
    	});

    	$$self.$inject_state = $$props => {
    		if ('measurements' in $$props) $$invalidate(0, measurements = $$props.measurements);
    		if ('totalConsumption' in $$props) $$invalidate(1, totalConsumption = $$props.totalConsumption);
    		if ('averageConsumption' in $$props) $$invalidate(2, averageConsumption = $$props.averageConsumption);
    		if ('lastMeasurement' in $$props) $$invalidate(3, lastMeasurement = $$props.lastMeasurement);
    		if ('recentMeasurements' in $$props) $$invalidate(4, recentMeasurements = $$props.recentMeasurements);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*measurements*/ 1) {
    			$$invalidate(4, recentMeasurements = measurements.slice(-5).reverse());
    		}
    	};

    	return [
    		measurements,
    		totalConsumption,
    		averageConsumption,
    		lastMeasurement,
    		recentMeasurements,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Dashboard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			measurements: 0,
    			totalConsumption: 1,
    			averageConsumption: 2,
    			lastMeasurement: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dashboard",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get measurements() {
    		throw new Error("<Dashboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set measurements(value) {
    		throw new Error("<Dashboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get totalConsumption() {
    		throw new Error("<Dashboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set totalConsumption(value) {
    		throw new Error("<Dashboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get averageConsumption() {
    		throw new Error("<Dashboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set averageConsumption(value) {
    		throw new Error("<Dashboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lastMeasurement() {
    		throw new Error("<Dashboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lastMeasurement(value) {
    		throw new Error("<Dashboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/MeasurementForm.svelte generated by Svelte v3.59.2 */

    const file$3 = "src/components/MeasurementForm.svelte";

    function create_fragment$3(ctx) {
    	let div12;
    	let div10;
    	let h1;
    	let t1;
    	let form;
    	let div2;
    	let div0;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let div1;
    	let label1;
    	let t6;
    	let input1;
    	let t7;
    	let div5;
    	let div3;
    	let label2;
    	let t9;
    	let input2;
    	let t10;
    	let div4;
    	let label3;
    	let t12;
    	let input3;
    	let t13;
    	let div7;
    	let label4;
    	let t15;
    	let div6;
    	let span0;
    	let t16_value = /*consumption*/ ctx[3].toFixed(3) + "";
    	let t16;
    	let t17;
    	let t18;
    	let span1;
    	let t19;
    	let t20_value = (/*consumption*/ ctx[3] * 1000).toFixed(0) + "";
    	let t20;
    	let t21;
    	let t22;
    	let div8;
    	let label5;
    	let t24;
    	let textarea;
    	let t25;
    	let div9;
    	let button0;
    	let t26;
    	let button0_disabled_value;
    	let t27;
    	let button1;
    	let t29;
    	let div11;
    	let h3;
    	let t31;
    	let ul;
    	let li0;
    	let t33;
    	let li1;
    	let t35;
    	let li2;
    	let t37;
    	let li3;
    	let t39;
    	let li4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div12 = element("div");
    			div10 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Nova Medição de Água";
    			t1 = space();
    			form = element("form");
    			div2 = element("div");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Número do Hidrômetro *";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Localização";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			div5 = element("div");
    			div3 = element("div");
    			label2 = element("label");
    			label2.textContent = "Leitura Anterior (m³) *";
    			t9 = space();
    			input2 = element("input");
    			t10 = space();
    			div4 = element("div");
    			label3 = element("label");
    			label3.textContent = "Leitura Atual (m³) *";
    			t12 = space();
    			input3 = element("input");
    			t13 = space();
    			div7 = element("div");
    			label4 = element("label");
    			label4.textContent = "Consumo Calculado";
    			t15 = space();
    			div6 = element("div");
    			span0 = element("span");
    			t16 = text(t16_value);
    			t17 = text(" m³");
    			t18 = space();
    			span1 = element("span");
    			t19 = text("(");
    			t20 = text(t20_value);
    			t21 = text(" litros)");
    			t22 = space();
    			div8 = element("div");
    			label5 = element("label");
    			label5.textContent = "Observações";
    			t24 = space();
    			textarea = element("textarea");
    			t25 = space();
    			div9 = element("div");
    			button0 = element("button");
    			t26 = text("💾 Salvar Medição");
    			t27 = space();
    			button1 = element("button");
    			button1.textContent = "🔄 Limpar";
    			t29 = space();
    			div11 = element("div");
    			h3 = element("h3");
    			h3.textContent = "💡 Dicas para Medição";
    			t31 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "Certifique-se de que o hidrômetro está visível e legível";
    			t33 = space();
    			li1 = element("li");
    			li1.textContent = "Anote a leitura atual com precisão (3 casas decimais)";
    			t35 = space();
    			li2 = element("li");
    			li2.textContent = "O consumo é calculado automaticamente: Leitura Atual - Leitura Anterior";
    			t37 = space();
    			li3 = element("li");
    			li3.textContent = "Se a leitura atual for menor que a anterior, verifique se houve troca do hidrômetro";
    			t39 = space();
    			li4 = element("li");
    			li4.textContent = "Registre observações importantes como vazamentos ou irregularidades";
    			attr_dev(h1, "class", "mb-4");
    			add_location(h1, file$3, 55, 2, 1184);
    			attr_dev(label0, "class", "form-label");
    			attr_dev(label0, "for", "meterNumber");
    			add_location(label0, file$3, 60, 5, 1342);
    			attr_dev(input0, "id", "meterNumber");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "form-input");
    			attr_dev(input0, "placeholder", "Ex: 123456789");
    			input0.required = true;
    			add_location(input0, file$3, 63, 5, 1435);
    			attr_dev(div0, "class", "form-group");
    			add_location(div0, file$3, 59, 4, 1312);
    			attr_dev(label1, "class", "form-label");
    			attr_dev(label1, "for", "location");
    			add_location(label1, file$3, 74, 5, 1642);
    			attr_dev(input1, "id", "location");
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "class", "form-input");
    			attr_dev(input1, "placeholder", "Ex: Residência, Comércio, etc.");
    			add_location(input1, file$3, 77, 5, 1721);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$3, 73, 4, 1612);
    			attr_dev(div2, "class", "grid grid-2");
    			add_location(div2, file$3, 58, 3, 1282);
    			attr_dev(label2, "class", "form-label");
    			attr_dev(label2, "for", "previousReading");
    			add_location(label2, file$3, 89, 5, 1963);
    			attr_dev(input2, "id", "previousReading");
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "step", "0.001");
    			attr_dev(input2, "class", "form-input");
    			attr_dev(input2, "placeholder", "Ex: 123.456");
    			input2.required = true;
    			add_location(input2, file$3, 92, 5, 2061);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file$3, 88, 4, 1933);
    			attr_dev(label3, "class", "form-label");
    			attr_dev(label3, "for", "currentReading");
    			add_location(label3, file$3, 104, 5, 2295);
    			attr_dev(input3, "id", "currentReading");
    			attr_dev(input3, "type", "number");
    			attr_dev(input3, "step", "0.001");
    			attr_dev(input3, "class", "form-input");
    			attr_dev(input3, "placeholder", "Ex: 125.789");
    			input3.required = true;
    			add_location(input3, file$3, 107, 5, 2389);
    			attr_dev(div4, "class", "form-group");
    			add_location(div4, file$3, 103, 4, 2265);
    			attr_dev(div5, "class", "grid grid-2");
    			add_location(div5, file$3, 87, 3, 1903);
    			attr_dev(label4, "class", "form-label");
    			add_location(label4, file$3, 120, 4, 2629);
    			attr_dev(span0, "class", "consumption-value svelte-1dhufr6");
    			add_location(span0, file$3, 122, 5, 2724);
    			attr_dev(span1, "class", "consumption-liters svelte-1dhufr6");
    			add_location(span1, file$3, 125, 5, 2809);
    			attr_dev(div6, "class", "consumption-display svelte-1dhufr6");
    			add_location(div6, file$3, 121, 4, 2685);
    			attr_dev(div7, "class", "form-group");
    			add_location(div7, file$3, 119, 3, 2600);
    			attr_dev(label5, "class", "form-label");
    			attr_dev(label5, "for", "notes");
    			add_location(label5, file$3, 132, 4, 2959);
    			attr_dev(textarea, "id", "notes");
    			attr_dev(textarea, "class", "form-input");
    			attr_dev(textarea, "placeholder", "Observações sobre a medição...");
    			attr_dev(textarea, "rows", "3");
    			add_location(textarea, file$3, 135, 4, 3032);
    			attr_dev(div8, "class", "form-group");
    			add_location(div8, file$3, 131, 3, 2930);
    			attr_dev(button0, "type", "submit");
    			attr_dev(button0, "class", "btn svelte-1dhufr6");
    			button0.disabled = button0_disabled_value = !/*isValid*/ ctx[6];
    			add_location(button0, file$3, 145, 4, 3232);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "btn btn-secondary svelte-1dhufr6");
    			add_location(button1, file$3, 153, 4, 3356);
    			attr_dev(div9, "class", "form-actions svelte-1dhufr6");
    			add_location(div9, file$3, 144, 3, 3201);
    			add_location(form, file$3, 57, 2, 1232);
    			attr_dev(div10, "class", "card");
    			add_location(div10, file$3, 54, 1, 1163);
    			attr_dev(h3, "class", "mb-3");
    			add_location(h3, file$3, 172, 2, 3674);
    			attr_dev(li0, "class", "svelte-1dhufr6");
    			add_location(li0, file$3, 174, 3, 3746);
    			attr_dev(li1, "class", "svelte-1dhufr6");
    			add_location(li1, file$3, 175, 3, 3815);
    			attr_dev(li2, "class", "svelte-1dhufr6");
    			add_location(li2, file$3, 176, 3, 3881);
    			attr_dev(li3, "class", "svelte-1dhufr6");
    			add_location(li3, file$3, 177, 3, 3965);
    			attr_dev(li4, "class", "svelte-1dhufr6");
    			add_location(li4, file$3, 178, 3, 4061);
    			attr_dev(ul, "class", "help-list svelte-1dhufr6");
    			add_location(ul, file$3, 173, 2, 3720);
    			attr_dev(div11, "class", "card");
    			add_location(div11, file$3, 171, 1, 3653);
    			attr_dev(div12, "class", "measurement-form svelte-1dhufr6");
    			add_location(div12, file$3, 53, 0, 1131);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div10);
    			append_dev(div10, h1);
    			append_dev(div10, t1);
    			append_dev(div10, form);
    			append_dev(form, div2);
    			append_dev(div2, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			append_dev(div0, input0);
    			set_input_value(input0, /*meterNumber*/ ctx[0]);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t6);
    			append_dev(div1, input1);
    			set_input_value(input1, /*location*/ ctx[4]);
    			append_dev(form, t7);
    			append_dev(form, div5);
    			append_dev(div5, div3);
    			append_dev(div3, label2);
    			append_dev(div3, t9);
    			append_dev(div3, input2);
    			set_input_value(input2, /*previousReading*/ ctx[2]);
    			append_dev(div5, t10);
    			append_dev(div5, div4);
    			append_dev(div4, label3);
    			append_dev(div4, t12);
    			append_dev(div4, input3);
    			set_input_value(input3, /*currentReading*/ ctx[1]);
    			append_dev(form, t13);
    			append_dev(form, div7);
    			append_dev(div7, label4);
    			append_dev(div7, t15);
    			append_dev(div7, div6);
    			append_dev(div6, span0);
    			append_dev(span0, t16);
    			append_dev(span0, t17);
    			append_dev(div6, t18);
    			append_dev(div6, span1);
    			append_dev(span1, t19);
    			append_dev(span1, t20);
    			append_dev(span1, t21);
    			append_dev(form, t22);
    			append_dev(form, div8);
    			append_dev(div8, label5);
    			append_dev(div8, t24);
    			append_dev(div8, textarea);
    			set_input_value(textarea, /*notes*/ ctx[5]);
    			append_dev(form, t25);
    			append_dev(form, div9);
    			append_dev(div9, button0);
    			append_dev(button0, t26);
    			append_dev(div9, t27);
    			append_dev(div9, button1);
    			append_dev(div12, t29);
    			append_dev(div12, div11);
    			append_dev(div11, h3);
    			append_dev(div11, t31);
    			append_dev(div11, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t33);
    			append_dev(ul, li1);
    			append_dev(ul, t35);
    			append_dev(ul, li2);
    			append_dev(ul, t37);
    			append_dev(ul, li3);
    			append_dev(ul, t39);
    			append_dev(ul, li4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[9]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[10]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[11]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[12]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[13]),
    					listen_dev(button1, "click", /*click_handler*/ ctx[14], false, false, false, false),
    					listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[7]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*meterNumber*/ 1 && input0.value !== /*meterNumber*/ ctx[0]) {
    				set_input_value(input0, /*meterNumber*/ ctx[0]);
    			}

    			if (dirty & /*location*/ 16 && input1.value !== /*location*/ ctx[4]) {
    				set_input_value(input1, /*location*/ ctx[4]);
    			}

    			if (dirty & /*previousReading*/ 4 && to_number(input2.value) !== /*previousReading*/ ctx[2]) {
    				set_input_value(input2, /*previousReading*/ ctx[2]);
    			}

    			if (dirty & /*currentReading*/ 2 && to_number(input3.value) !== /*currentReading*/ ctx[1]) {
    				set_input_value(input3, /*currentReading*/ ctx[1]);
    			}

    			if (dirty & /*consumption*/ 8 && t16_value !== (t16_value = /*consumption*/ ctx[3].toFixed(3) + "")) set_data_dev(t16, t16_value);
    			if (dirty & /*consumption*/ 8 && t20_value !== (t20_value = (/*consumption*/ ctx[3] * 1000).toFixed(0) + "")) set_data_dev(t20, t20_value);

    			if (dirty & /*notes*/ 32) {
    				set_input_value(textarea, /*notes*/ ctx[5]);
    			}

    			if (dirty & /*isValid*/ 64 && button0_disabled_value !== (button0_disabled_value = !/*isValid*/ ctx[6])) {
    				prop_dev(button0, "disabled", button0_disabled_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div12);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('MeasurementForm', slots, []);
    	let { addMeasurement } = $$props;
    	let meterNumber = '';
    	let currentReading = '';
    	let previousReading = '';
    	let consumption = 0;
    	let location = '';
    	let notes = '';
    	let isValid = false;

    	function handleSubmit() {
    		if (!isValid) return;

    		const measurement = {
    			meterNumber: meterNumber.trim(),
    			currentReading: parseFloat(currentReading),
    			previousReading: parseFloat(previousReading),
    			consumption,
    			location: location.trim(),
    			notes: notes.trim()
    		};

    		addMeasurement(measurement);

    		// Reset form
    		$$invalidate(0, meterNumber = '');

    		$$invalidate(1, currentReading = '');
    		$$invalidate(2, previousReading = '');
    		$$invalidate(4, location = '');
    		$$invalidate(5, notes = '');

    		// Show success message
    		alert('Medição registrada com sucesso!');
    	}

    	function calculateConsumption() {
    		if (currentReading && previousReading) {
    			$$invalidate(3, consumption = parseFloat(currentReading) - parseFloat(previousReading));
    		}
    	}

    	$$self.$$.on_mount.push(function () {
    		if (addMeasurement === undefined && !('addMeasurement' in $$props || $$self.$$.bound[$$self.$$.props['addMeasurement']])) {
    			console.warn("<MeasurementForm> was created without expected prop 'addMeasurement'");
    		}
    	});

    	const writable_props = ['addMeasurement'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<MeasurementForm> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		meterNumber = this.value;
    		$$invalidate(0, meterNumber);
    	}

    	function input1_input_handler() {
    		location = this.value;
    		$$invalidate(4, location);
    	}

    	function input2_input_handler() {
    		previousReading = to_number(this.value);
    		$$invalidate(2, previousReading);
    	}

    	function input3_input_handler() {
    		currentReading = to_number(this.value);
    		$$invalidate(1, currentReading);
    	}

    	function textarea_input_handler() {
    		notes = this.value;
    		$$invalidate(5, notes);
    	}

    	const click_handler = () => {
    		$$invalidate(0, meterNumber = '');
    		$$invalidate(1, currentReading = '');
    		$$invalidate(2, previousReading = '');
    		$$invalidate(4, location = '');
    		$$invalidate(5, notes = '');
    	};

    	$$self.$$set = $$props => {
    		if ('addMeasurement' in $$props) $$invalidate(8, addMeasurement = $$props.addMeasurement);
    	};

    	$$self.$capture_state = () => ({
    		addMeasurement,
    		meterNumber,
    		currentReading,
    		previousReading,
    		consumption,
    		location,
    		notes,
    		isValid,
    		handleSubmit,
    		calculateConsumption
    	});

    	$$self.$inject_state = $$props => {
    		if ('addMeasurement' in $$props) $$invalidate(8, addMeasurement = $$props.addMeasurement);
    		if ('meterNumber' in $$props) $$invalidate(0, meterNumber = $$props.meterNumber);
    		if ('currentReading' in $$props) $$invalidate(1, currentReading = $$props.currentReading);
    		if ('previousReading' in $$props) $$invalidate(2, previousReading = $$props.previousReading);
    		if ('consumption' in $$props) $$invalidate(3, consumption = $$props.consumption);
    		if ('location' in $$props) $$invalidate(4, location = $$props.location);
    		if ('notes' in $$props) $$invalidate(5, notes = $$props.notes);
    		if ('isValid' in $$props) $$invalidate(6, isValid = $$props.isValid);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*currentReading, previousReading, consumption, meterNumber*/ 15) {
    			{
    				if (currentReading && previousReading) {
    					$$invalidate(3, consumption = parseFloat(currentReading) - parseFloat(previousReading));
    					$$invalidate(6, isValid = consumption >= 0 && meterNumber.trim() !== '');
    				} else {
    					$$invalidate(3, consumption = 0);
    					$$invalidate(6, isValid = false);
    				}
    			}
    		}
    	};

    	return [
    		meterNumber,
    		currentReading,
    		previousReading,
    		consumption,
    		location,
    		notes,
    		isValid,
    		handleSubmit,
    		addMeasurement,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		textarea_input_handler,
    		click_handler
    	];
    }

    class MeasurementForm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { addMeasurement: 8 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MeasurementForm",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get addMeasurement() {
    		throw new Error("<MeasurementForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set addMeasurement(value) {
    		throw new Error("<MeasurementForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/History.svelte generated by Svelte v3.59.2 */

    const file$2 = "src/components/History.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (111:2) {:else}
    function create_else_block$1(ctx) {
    	let div0;
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;
    	let t5;
    	let th3;
    	let t7;
    	let th4;
    	let t9;
    	let th5;
    	let t11;
    	let th6;
    	let t13;
    	let th7;
    	let t15;
    	let tbody;
    	let t16;
    	let div1;
    	let p;
    	let t17;
    	let t18_value = /*filteredMeasurements*/ ctx[4].length + "";
    	let t18;
    	let t19;
    	let t20_value = /*measurements*/ ctx[0].length + "";
    	let t20;
    	let t21;
    	let each_value = /*filteredMeasurements*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Data";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "Hidrômetro";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "Localização";
    			t5 = space();
    			th3 = element("th");
    			th3.textContent = "Leitura Anterior";
    			t7 = space();
    			th4 = element("th");
    			th4.textContent = "Leitura Atual";
    			t9 = space();
    			th5 = element("th");
    			th5.textContent = "Consumo (L)";
    			t11 = space();
    			th6 = element("th");
    			th6.textContent = "Status";
    			t13 = space();
    			th7 = element("th");
    			th7.textContent = "Ações";
    			t15 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t16 = space();
    			div1 = element("div");
    			p = element("p");
    			t17 = text("Mostrando ");
    			t18 = text(t18_value);
    			t19 = text(" de ");
    			t20 = text(t20_value);
    			t21 = text(" medições");
    			add_location(th0, file$2, 115, 7, 2982);
    			add_location(th1, file$2, 116, 7, 3003);
    			add_location(th2, file$2, 117, 7, 3030);
    			add_location(th3, file$2, 118, 7, 3058);
    			add_location(th4, file$2, 119, 7, 3091);
    			add_location(th5, file$2, 120, 7, 3121);
    			add_location(th6, file$2, 121, 7, 3149);
    			add_location(th7, file$2, 122, 7, 3172);
    			add_location(tr, file$2, 114, 6, 2970);
    			add_location(thead, file$2, 113, 5, 2956);
    			add_location(tbody, file$2, 125, 5, 3218);
    			attr_dev(table, "class", "table");
    			add_location(table, file$2, 112, 4, 2929);
    			attr_dev(div0, "class", "table-container svelte-6z5pmm");
    			add_location(div0, file$2, 111, 3, 2895);
    			attr_dev(p, "class", "text-muted svelte-6z5pmm");
    			add_location(p, file$2, 170, 4, 4634);
    			attr_dev(div1, "class", "history-footer svelte-6z5pmm");
    			add_location(div1, file$2, 169, 3, 4601);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, table);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t1);
    			append_dev(tr, th1);
    			append_dev(tr, t3);
    			append_dev(tr, th2);
    			append_dev(tr, t5);
    			append_dev(tr, th3);
    			append_dev(tr, t7);
    			append_dev(tr, th4);
    			append_dev(tr, t9);
    			append_dev(tr, th5);
    			append_dev(tr, t11);
    			append_dev(tr, th6);
    			append_dev(tr, t13);
    			append_dev(tr, th7);
    			append_dev(table, t15);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(tbody, null);
    				}
    			}

    			insert_dev(target, t16, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, p);
    			append_dev(p, t17);
    			append_dev(p, t18);
    			append_dev(p, t19);
    			append_dev(p, t20);
    			append_dev(p, t21);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*handleDelete, filteredMeasurements, Date*/ 48) {
    				each_value = /*filteredMeasurements*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*filteredMeasurements*/ 16 && t18_value !== (t18_value = /*filteredMeasurements*/ ctx[4].length + "")) set_data_dev(t18, t18_value);
    			if (dirty & /*measurements*/ 1 && t20_value !== (t20_value = /*measurements*/ ctx[0].length + "")) set_data_dev(t20, t20_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(111:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (105:46) 
    function create_if_block_1$2(ctx) {
    	let div1;
    	let div0;
    	let t1;
    	let h3;
    	let t3;
    	let p;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "🔍";
    			t1 = space();
    			h3 = element("h3");
    			h3.textContent = "Nenhum resultado encontrado";
    			t3 = space();
    			p = element("p");
    			p.textContent = "Tente ajustar os filtros de busca.";
    			attr_dev(div0, "class", "empty-icon svelte-6z5pmm");
    			add_location(div0, file$2, 106, 4, 2752);
    			add_location(h3, file$2, 107, 4, 2789);
    			add_location(p, file$2, 108, 4, 2830);
    			attr_dev(div1, "class", "empty-state svelte-6z5pmm");
    			add_location(div1, file$2, 105, 3, 2722);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t1);
    			append_dev(div1, h3);
    			append_dev(div1, t3);
    			append_dev(div1, p);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(105:46) ",
    		ctx
    	});

    	return block;
    }

    // (99:2) {#if measurements.length === 0}
    function create_if_block$2(ctx) {
    	let div1;
    	let div0;
    	let t1;
    	let h3;
    	let t3;
    	let p;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "📊";
    			t1 = space();
    			h3 = element("h3");
    			h3.textContent = "Nenhuma medição encontrada";
    			t3 = space();
    			p = element("p");
    			p.textContent = "Comece registrando sua primeira medição de água.";
    			attr_dev(div0, "class", "empty-icon svelte-6z5pmm");
    			add_location(div0, file$2, 100, 4, 2529);
    			add_location(h3, file$2, 101, 4, 2566);
    			add_location(p, file$2, 102, 4, 2606);
    			attr_dev(div1, "class", "empty-state svelte-6z5pmm");
    			add_location(div1, file$2, 99, 3, 2499);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t1);
    			append_dev(div1, h3);
    			append_dev(div1, t3);
    			append_dev(div1, p);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(99:2) {#if measurements.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (151:10) {:else}
    function create_else_block_1$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Alto");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(151:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (149:48) 
    function create_if_block_3$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Normal");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(149:48) ",
    		ctx
    	});

    	return block;
    }

    // (147:10) {#if measurement.consumption < 1}
    function create_if_block_2$2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Baixo");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(147:10) {#if measurement.consumption < 1}",
    		ctx
    	});

    	return block;
    }

    // (127:6) {#each filteredMeasurements as measurement}
    function create_each_block$1(ctx) {
    	let tr;
    	let td0;
    	let t0_value = new Date(/*measurement*/ ctx[12].date).toLocaleDateString('pt-BR') + "";
    	let t0;
    	let t1;
    	let br0;
    	let t2;
    	let small0;
    	let t3_value = new Date(/*measurement*/ ctx[12].date).toLocaleTimeString('pt-BR') + "";
    	let t3;
    	let t4;
    	let td1;
    	let t5_value = /*measurement*/ ctx[12].meterNumber + "";
    	let t5;
    	let t6;
    	let td2;
    	let t7_value = (/*measurement*/ ctx[12].location || '-') + "";
    	let t7;
    	let t8;
    	let td3;
    	let t9_value = /*measurement*/ ctx[12].previousReading.toFixed(3) + "";
    	let t9;
    	let t10;
    	let t11;
    	let td4;
    	let t12_value = /*measurement*/ ctx[12].currentReading.toFixed(3) + "";
    	let t12;
    	let t13;
    	let t14;
    	let td5;
    	let strong;
    	let t15_value = /*measurement*/ ctx[12].consumption.toFixed(1) + "";
    	let t15;
    	let t16;
    	let br1;
    	let t17;
    	let small1;
    	let t18;
    	let t19_value = (/*measurement*/ ctx[12].consumption * 1000).toFixed(0) + "";
    	let t19;
    	let t20;
    	let t21;
    	let td6;
    	let span;
    	let t22;
    	let td7;
    	let button;
    	let t24;
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*measurement*/ ctx[12].consumption < 1) return create_if_block_2$2;
    		if (/*measurement*/ ctx[12].consumption < 5) return create_if_block_3$2;
    		return create_else_block_1$1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler() {
    		return /*click_handler*/ ctx[11](/*measurement*/ ctx[12]);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			small0 = element("small");
    			t3 = text(t3_value);
    			t4 = space();
    			td1 = element("td");
    			t5 = text(t5_value);
    			t6 = space();
    			td2 = element("td");
    			t7 = text(t7_value);
    			t8 = space();
    			td3 = element("td");
    			t9 = text(t9_value);
    			t10 = text(" m³");
    			t11 = space();
    			td4 = element("td");
    			t12 = text(t12_value);
    			t13 = text(" m³");
    			t14 = space();
    			td5 = element("td");
    			strong = element("strong");
    			t15 = text(t15_value);
    			t16 = space();
    			br1 = element("br");
    			t17 = space();
    			small1 = element("small");
    			t18 = text("(");
    			t19 = text(t19_value);
    			t20 = text(" L)");
    			t21 = space();
    			td6 = element("td");
    			span = element("span");
    			if_block.c();
    			t22 = space();
    			td7 = element("td");
    			button = element("button");
    			button.textContent = "🗑️";
    			t24 = space();
    			add_location(br0, file$2, 130, 9, 3376);
    			attr_dev(small0, "class", "text-muted svelte-6z5pmm");
    			add_location(small0, file$2, 131, 9, 3390);
    			add_location(td0, file$2, 128, 8, 3296);
    			add_location(td1, file$2, 135, 8, 3524);
    			add_location(td2, file$2, 136, 8, 3567);
    			add_location(td3, file$2, 137, 8, 3614);
    			add_location(td4, file$2, 138, 8, 3675);
    			add_location(strong, file$2, 140, 9, 3774);
    			add_location(br1, file$2, 141, 9, 3837);
    			add_location(small1, file$2, 142, 9, 3851);
    			attr_dev(td5, "class", "consumption-cell svelte-6z5pmm");
    			add_location(td5, file$2, 139, 8, 3735);
    			attr_dev(span, "class", "status-badge svelte-6z5pmm");
    			toggle_class(span, "low", /*measurement*/ ctx[12].consumption < 1);
    			toggle_class(span, "normal", /*measurement*/ ctx[12].consumption >= 1 && /*measurement*/ ctx[12].consumption < 5);
    			toggle_class(span, "high", /*measurement*/ ctx[12].consumption >= 5);
    			add_location(span, file$2, 145, 9, 3952);
    			add_location(td6, file$2, 144, 8, 3938);
    			attr_dev(button, "class", "btn-danger btn-small svelte-6z5pmm");
    			add_location(button, file$2, 156, 9, 4368);
    			add_location(td7, file$2, 155, 8, 4354);
    			add_location(tr, file$2, 127, 7, 3283);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(td0, t1);
    			append_dev(td0, br0);
    			append_dev(td0, t2);
    			append_dev(td0, small0);
    			append_dev(small0, t3);
    			append_dev(tr, t4);
    			append_dev(tr, td1);
    			append_dev(td1, t5);
    			append_dev(tr, t6);
    			append_dev(tr, td2);
    			append_dev(td2, t7);
    			append_dev(tr, t8);
    			append_dev(tr, td3);
    			append_dev(td3, t9);
    			append_dev(td3, t10);
    			append_dev(tr, t11);
    			append_dev(tr, td4);
    			append_dev(td4, t12);
    			append_dev(td4, t13);
    			append_dev(tr, t14);
    			append_dev(tr, td5);
    			append_dev(td5, strong);
    			append_dev(strong, t15);
    			append_dev(td5, t16);
    			append_dev(td5, br1);
    			append_dev(td5, t17);
    			append_dev(td5, small1);
    			append_dev(small1, t18);
    			append_dev(small1, t19);
    			append_dev(small1, t20);
    			append_dev(tr, t21);
    			append_dev(tr, td6);
    			append_dev(td6, span);
    			if_block.m(span, null);
    			append_dev(tr, t22);
    			append_dev(tr, td7);
    			append_dev(td7, button);
    			append_dev(tr, t24);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*filteredMeasurements*/ 16 && t0_value !== (t0_value = new Date(/*measurement*/ ctx[12].date).toLocaleDateString('pt-BR') + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*filteredMeasurements*/ 16 && t3_value !== (t3_value = new Date(/*measurement*/ ctx[12].date).toLocaleTimeString('pt-BR') + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*filteredMeasurements*/ 16 && t5_value !== (t5_value = /*measurement*/ ctx[12].meterNumber + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*filteredMeasurements*/ 16 && t7_value !== (t7_value = (/*measurement*/ ctx[12].location || '-') + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*filteredMeasurements*/ 16 && t9_value !== (t9_value = /*measurement*/ ctx[12].previousReading.toFixed(3) + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*filteredMeasurements*/ 16 && t12_value !== (t12_value = /*measurement*/ ctx[12].currentReading.toFixed(3) + "")) set_data_dev(t12, t12_value);
    			if (dirty & /*filteredMeasurements*/ 16 && t15_value !== (t15_value = /*measurement*/ ctx[12].consumption.toFixed(1) + "")) set_data_dev(t15, t15_value);
    			if (dirty & /*filteredMeasurements*/ 16 && t19_value !== (t19_value = (/*measurement*/ ctx[12].consumption * 1000).toFixed(0) + "")) set_data_dev(t19, t19_value);

    			if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}

    			if (dirty & /*filteredMeasurements*/ 16) {
    				toggle_class(span, "low", /*measurement*/ ctx[12].consumption < 1);
    			}

    			if (dirty & /*filteredMeasurements*/ 16) {
    				toggle_class(span, "normal", /*measurement*/ ctx[12].consumption >= 1 && /*measurement*/ ctx[12].consumption < 5);
    			}

    			if (dirty & /*filteredMeasurements*/ 16) {
    				toggle_class(span, "high", /*measurement*/ ctx[12].consumption >= 5);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(127:6) {#each filteredMeasurements as measurement}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div5;
    	let div4;
    	let div3;
    	let h1;
    	let t1;
    	let div2;
    	let div0;
    	let input;
    	let t2;
    	let div1;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let t6;
    	let select1;
    	let option3;
    	let option4;
    	let t9;
    	let button;
    	let t11;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*measurements*/ ctx[0].length === 0) return create_if_block$2;
    		if (/*filteredMeasurements*/ ctx[4].length === 0) return create_if_block_1$2;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Histórico de Medições";
    			t1 = space();
    			div2 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t2 = space();
    			div1 = element("div");
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "Data";
    			option1 = element("option");
    			option1.textContent = "Consumo";
    			option2 = element("option");
    			option2.textContent = "Hidrômetro";
    			t6 = space();
    			select1 = element("select");
    			option3 = element("option");
    			option3.textContent = "Decrescente";
    			option4 = element("option");
    			option4.textContent = "Crescente";
    			t9 = space();
    			button = element("button");
    			button.textContent = "📥 Exportar Dados";
    			t11 = space();
    			if_block.c();
    			attr_dev(h1, "class", "mb-3");
    			add_location(h1, file$2, 67, 3, 1617);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-input");
    			attr_dev(input, "placeholder", "Buscar por hidrômetro, localização ou observações...");
    			add_location(input, file$2, 71, 5, 1733);
    			attr_dev(div0, "class", "search-box svelte-6z5pmm");
    			add_location(div0, file$2, 70, 4, 1703);
    			option0.__value = "date";
    			option0.value = option0.__value;
    			add_location(option0, file$2, 81, 6, 2002);
    			option1.__value = "consumption";
    			option1.value = option1.__value;
    			add_location(option1, file$2, 82, 6, 2043);
    			option2.__value = "meterNumber";
    			option2.value = option2.__value;
    			add_location(option2, file$2, 83, 6, 2094);
    			attr_dev(select0, "class", "form-select svelte-6z5pmm");
    			if (/*sortBy*/ ctx[2] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[9].call(select0));
    			add_location(select0, file$2, 80, 5, 1947);
    			option3.__value = "desc";
    			option3.value = option3.__value;
    			add_location(option3, file$2, 87, 6, 2226);
    			option4.__value = "asc";
    			option4.value = option4.__value;
    			add_location(option4, file$2, 88, 6, 2274);
    			attr_dev(select1, "class", "form-select svelte-6z5pmm");
    			if (/*sortOrder*/ ctx[3] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[10].call(select1));
    			add_location(select1, file$2, 86, 5, 2168);
    			attr_dev(div1, "class", "sort-controls svelte-6z5pmm");
    			add_location(div1, file$2, 79, 4, 1914);
    			attr_dev(button, "class", "btn btn-secondary");
    			add_location(button, file$2, 92, 4, 2348);
    			attr_dev(div2, "class", "history-controls svelte-6z5pmm");
    			add_location(div2, file$2, 69, 3, 1668);
    			attr_dev(div3, "class", "history-header svelte-6z5pmm");
    			add_location(div3, file$2, 66, 2, 1585);
    			attr_dev(div4, "class", "card");
    			add_location(div4, file$2, 65, 1, 1564);
    			attr_dev(div5, "class", "history svelte-6z5pmm");
    			add_location(div5, file$2, 64, 0, 1541);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h1);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*searchTerm*/ ctx[1]);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);
    			select_option(select0, /*sortBy*/ ctx[2], true);
    			append_dev(div1, t6);
    			append_dev(div1, select1);
    			append_dev(select1, option3);
    			append_dev(select1, option4);
    			select_option(select1, /*sortOrder*/ ctx[3], true);
    			append_dev(div2, t9);
    			append_dev(div2, button);
    			append_dev(div4, t11);
    			if_block.m(div4, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[8]),
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[9]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[10]),
    					listen_dev(button, "click", /*exportData*/ ctx[6], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*searchTerm*/ 2 && input.value !== /*searchTerm*/ ctx[1]) {
    				set_input_value(input, /*searchTerm*/ ctx[1]);
    			}

    			if (dirty & /*sortBy*/ 4) {
    				select_option(select0, /*sortBy*/ ctx[2]);
    			}

    			if (dirty & /*sortOrder*/ 8) {
    				select_option(select1, /*sortOrder*/ ctx[3]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div4, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let filteredMeasurements;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('History', slots, []);
    	let { measurements } = $$props;
    	let { deleteMeasurement } = $$props;
    	let searchTerm = '';
    	let sortBy = 'date';
    	let sortOrder = 'desc';

    	function handleDelete(id) {
    		if (confirm('Tem certeza que deseja excluir esta medição?')) {
    			deleteMeasurement(id);
    		}
    	}

    	function exportData() {
    		const dataStr = JSON.stringify(measurements, null, 2);
    		const dataBlob = new Blob([dataStr], { type: 'application/json' });
    		const url = URL.createObjectURL(dataBlob);
    		const link = document.createElement('a');
    		link.href = url;
    		link.download = `cagece-medicoes-${new Date().toISOString().split('T')[0]}.json`;
    		link.click();
    		URL.revokeObjectURL(url);
    	}

    	$$self.$$.on_mount.push(function () {
    		if (measurements === undefined && !('measurements' in $$props || $$self.$$.bound[$$self.$$.props['measurements']])) {
    			console.warn("<History> was created without expected prop 'measurements'");
    		}

    		if (deleteMeasurement === undefined && !('deleteMeasurement' in $$props || $$self.$$.bound[$$self.$$.props['deleteMeasurement']])) {
    			console.warn("<History> was created without expected prop 'deleteMeasurement'");
    		}
    	});

    	const writable_props = ['measurements', 'deleteMeasurement'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<History> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		searchTerm = this.value;
    		$$invalidate(1, searchTerm);
    	}

    	function select0_change_handler() {
    		sortBy = select_value(this);
    		$$invalidate(2, sortBy);
    	}

    	function select1_change_handler() {
    		sortOrder = select_value(this);
    		$$invalidate(3, sortOrder);
    	}

    	const click_handler = measurement => handleDelete(measurement.id);

    	$$self.$$set = $$props => {
    		if ('measurements' in $$props) $$invalidate(0, measurements = $$props.measurements);
    		if ('deleteMeasurement' in $$props) $$invalidate(7, deleteMeasurement = $$props.deleteMeasurement);
    	};

    	$$self.$capture_state = () => ({
    		measurements,
    		deleteMeasurement,
    		searchTerm,
    		sortBy,
    		sortOrder,
    		handleDelete,
    		exportData,
    		filteredMeasurements
    	});

    	$$self.$inject_state = $$props => {
    		if ('measurements' in $$props) $$invalidate(0, measurements = $$props.measurements);
    		if ('deleteMeasurement' in $$props) $$invalidate(7, deleteMeasurement = $$props.deleteMeasurement);
    		if ('searchTerm' in $$props) $$invalidate(1, searchTerm = $$props.searchTerm);
    		if ('sortBy' in $$props) $$invalidate(2, sortBy = $$props.sortBy);
    		if ('sortOrder' in $$props) $$invalidate(3, sortOrder = $$props.sortOrder);
    		if ('filteredMeasurements' in $$props) $$invalidate(4, filteredMeasurements = $$props.filteredMeasurements);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*measurements, searchTerm, sortBy, sortOrder*/ 15) {
    			$$invalidate(4, filteredMeasurements = measurements.filter(measurement => {
    				if (!searchTerm) return true;
    				const term = searchTerm.toLowerCase();
    				return measurement.meterNumber.toLowerCase().includes(term) || measurement.location.toLowerCase().includes(term) || measurement.notes.toLowerCase().includes(term);
    			}).sort((a, b) => {
    				let aValue, bValue;

    				switch (sortBy) {
    					case 'date':
    						aValue = new Date(a.date);
    						bValue = new Date(b.date);
    						break;
    					case 'consumption':
    						aValue = a.consumption;
    						bValue = b.consumption;
    						break;
    					case 'meterNumber':
    						aValue = a.meterNumber;
    						bValue = b.meterNumber;
    						break;
    					default:
    						aValue = a.date;
    						bValue = b.date;
    				}

    				if (sortOrder === 'asc') {
    					return aValue > bValue ? 1 : -1;
    				} else {
    					return aValue < bValue ? 1 : -1;
    				}
    			}));
    		}
    	};

    	return [
    		measurements,
    		searchTerm,
    		sortBy,
    		sortOrder,
    		filteredMeasurements,
    		handleDelete,
    		exportData,
    		deleteMeasurement,
    		input_input_handler,
    		select0_change_handler,
    		select1_change_handler,
    		click_handler
    	];
    }

    class History extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { measurements: 0, deleteMeasurement: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "History",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get measurements() {
    		throw new Error("<History>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set measurements(value) {
    		throw new Error("<History>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get deleteMeasurement() {
    		throw new Error("<History>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set deleteMeasurement(value) {
    		throw new Error("<History>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Reports.svelte generated by Svelte v3.59.2 */

    const { Object: Object_1 } = globals;
    const file$1 = "src/components/Reports.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[19] = i;
    	return child_ctx;
    }

    // (178:2) {:else}
    function create_else_block(ctx) {
    	let div12;
    	let div2;
    	let div0;
    	let t0_value = /*measurements*/ ctx[0].length + "";
    	let t0;
    	let t1;
    	let div1;
    	let t3;
    	let div5;
    	let div3;
    	let t4_value = /*totalConsumption*/ ctx[1].toFixed(1) + "";
    	let t4;
    	let t5;
    	let div4;
    	let t7;
    	let div8;
    	let div6;
    	let t8_value = /*averageConsumption*/ ctx[2].toFixed(1) + "";
    	let t8;
    	let t9;
    	let div7;
    	let t11;
    	let div11;
    	let div9;
    	let t12;
    	let div10;
    	let t14;
    	let div13;
    	let h20;
    	let t15;
    	let t16;
    	let t17;
    	let div15;
    	let h21;
    	let t19;
    	let div14;
    	let button;
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*trend*/ ctx[6] === 'increasing') return create_if_block_8;
    		if (/*trend*/ ctx[6] === 'decreasing') return create_if_block_9;
    		return create_else_block_4;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*selectedPeriod*/ ctx[3] === 'monthly') return create_if_block_6;
    		if (/*selectedPeriod*/ ctx[3] === 'weekly') return create_if_block_7;
    		return create_else_block_3;
    	}

    	let current_block_type_1 = select_block_type_2(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	function select_block_type_3(ctx, dirty) {
    		if (/*chartData*/ ctx[4].length > 0) return create_if_block_2$1;
    		return create_else_block_2;
    	}

    	let current_block_type_2 = select_block_type_3(ctx);
    	let if_block2 = current_block_type_2(ctx);
    	let if_block3 = /*topConsumers*/ ctx[5].length > 0 && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			div12 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "Total de Medições";
    			t3 = space();
    			div5 = element("div");
    			div3 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			div4 = element("div");
    			div4.textContent = "Consumo Total (L)";
    			t7 = space();
    			div8 = element("div");
    			div6 = element("div");
    			t8 = text(t8_value);
    			t9 = space();
    			div7 = element("div");
    			div7.textContent = "Média (L)";
    			t11 = space();
    			div11 = element("div");
    			div9 = element("div");
    			if_block0.c();
    			t12 = space();
    			div10 = element("div");
    			div10.textContent = "Tendência";
    			t14 = space();
    			div13 = element("div");
    			h20 = element("h2");
    			if_block1.c();
    			t15 = space();
    			if_block2.c();
    			t16 = space();
    			if (if_block3) if_block3.c();
    			t17 = space();
    			div15 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Exportar Relatório";
    			t19 = space();
    			div14 = element("div");
    			button = element("button");
    			button.textContent = "📊 Exportar Relatório Completo";
    			attr_dev(div0, "class", "stat-value");
    			add_location(div0, file$1, 181, 5, 4891);
    			attr_dev(div1, "class", "stat-label");
    			add_location(div1, file$1, 182, 5, 4948);
    			attr_dev(div2, "class", "stat-card");
    			add_location(div2, file$1, 180, 4, 4862);
    			attr_dev(div3, "class", "stat-value");
    			add_location(div3, file$1, 186, 5, 5045);
    			attr_dev(div4, "class", "stat-label");
    			add_location(div4, file$1, 187, 5, 5110);
    			attr_dev(div5, "class", "stat-card");
    			add_location(div5, file$1, 185, 4, 5016);
    			attr_dev(div6, "class", "stat-value");
    			add_location(div6, file$1, 191, 5, 5207);
    			attr_dev(div7, "class", "stat-label");
    			add_location(div7, file$1, 192, 5, 5274);
    			attr_dev(div8, "class", "stat-card");
    			add_location(div8, file$1, 190, 4, 5178);
    			attr_dev(div9, "class", "stat-value trend svelte-mfoj8f");
    			toggle_class(div9, "increasing", /*trend*/ ctx[6] === 'increasing');
    			toggle_class(div9, "decreasing", /*trend*/ ctx[6] === 'decreasing');
    			add_location(div9, file$1, 196, 5, 5363);
    			attr_dev(div10, "class", "stat-label");
    			add_location(div10, file$1, 205, 5, 5655);
    			attr_dev(div11, "class", "stat-card");
    			add_location(div11, file$1, 195, 4, 5334);
    			attr_dev(div12, "class", "stats-grid");
    			add_location(div12, file$1, 179, 3, 4833);
    			attr_dev(h20, "class", "mb-3");
    			add_location(h20, file$1, 211, 4, 5766);
    			attr_dev(div13, "class", "card");
    			add_location(div13, file$1, 210, 3, 5743);
    			attr_dev(h21, "class", "mb-3");
    			add_location(h21, file$1, 287, 4, 7896);
    			attr_dev(button, "class", "btn");
    			add_location(button, file$1, 289, 5, 7975);
    			attr_dev(div14, "class", "export-actions svelte-mfoj8f");
    			add_location(div14, file$1, 288, 4, 7941);
    			attr_dev(div15, "class", "card");
    			add_location(div15, file$1, 286, 3, 7873);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div12, anchor);
    			append_dev(div12, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div12, t3);
    			append_dev(div12, div5);
    			append_dev(div5, div3);
    			append_dev(div3, t4);
    			append_dev(div5, t5);
    			append_dev(div5, div4);
    			append_dev(div12, t7);
    			append_dev(div12, div8);
    			append_dev(div8, div6);
    			append_dev(div6, t8);
    			append_dev(div8, t9);
    			append_dev(div8, div7);
    			append_dev(div12, t11);
    			append_dev(div12, div11);
    			append_dev(div11, div9);
    			if_block0.m(div9, null);
    			append_dev(div11, t12);
    			append_dev(div11, div10);
    			insert_dev(target, t14, anchor);
    			insert_dev(target, div13, anchor);
    			append_dev(div13, h20);
    			if_block1.m(h20, null);
    			append_dev(div13, t15);
    			if_block2.m(div13, null);
    			insert_dev(target, t16, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, div15, anchor);
    			append_dev(div15, h21);
    			append_dev(div15, t19);
    			append_dev(div15, div14);
    			append_dev(div14, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*exportReport*/ ctx[7], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*measurements*/ 1 && t0_value !== (t0_value = /*measurements*/ ctx[0].length + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*totalConsumption*/ 2 && t4_value !== (t4_value = /*totalConsumption*/ ctx[1].toFixed(1) + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*averageConsumption*/ 4 && t8_value !== (t8_value = /*averageConsumption*/ ctx[2].toFixed(1) + "")) set_data_dev(t8, t8_value);

    			if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div9, null);
    				}
    			}

    			if (dirty & /*trend*/ 64) {
    				toggle_class(div9, "increasing", /*trend*/ ctx[6] === 'increasing');
    			}

    			if (dirty & /*trend*/ 64) {
    				toggle_class(div9, "decreasing", /*trend*/ ctx[6] === 'decreasing');
    			}

    			if (current_block_type_1 !== (current_block_type_1 = select_block_type_2(ctx))) {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(h20, null);
    				}
    			}

    			if (current_block_type_2 === (current_block_type_2 = select_block_type_3(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type_2(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div13, null);
    				}
    			}

    			if (/*topConsumers*/ ctx[5].length > 0) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_1$1(ctx);
    					if_block3.c();
    					if_block3.m(t17.parentNode, t17);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div12);
    			if_block0.d();
    			if (detaching) detach_dev(t14);
    			if (detaching) detach_dev(div13);
    			if_block1.d();
    			if_block2.d();
    			if (detaching) detach_dev(t16);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(div15);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(178:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (172:2) {#if measurements.length === 0}
    function create_if_block$1(ctx) {
    	let div1;
    	let div0;
    	let t1;
    	let h3;
    	let t3;
    	let p;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "📊";
    			t1 = space();
    			h3 = element("h3");
    			h3.textContent = "Nenhum dado disponível";
    			t3 = space();
    			p = element("p");
    			p.textContent = "Registre algumas medições para gerar relatórios.";
    			attr_dev(div0, "class", "empty-icon svelte-mfoj8f");
    			add_location(div0, file$1, 173, 4, 4655);
    			add_location(h3, file$1, 174, 4, 4692);
    			add_location(p, file$1, 175, 4, 4728);
    			attr_dev(div1, "class", "empty-state svelte-mfoj8f");
    			add_location(div1, file$1, 172, 3, 4625);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t1);
    			append_dev(div1, h3);
    			append_dev(div1, t3);
    			append_dev(div1, p);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(172:2) {#if measurements.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (202:6) {:else}
    function create_else_block_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("➡️ Estável");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_4.name,
    		type: "else",
    		source: "(202:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (200:39) 
    function create_if_block_9(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("📉 Diminuindo");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(200:39) ",
    		ctx
    	});

    	return block;
    }

    // (198:6) {#if trend === 'increasing'}
    function create_if_block_8(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("📈 Crescendo");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(198:6) {#if trend === 'increasing'}",
    		ctx
    	});

    	return block;
    }

    // (217:5) {:else}
    function create_else_block_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Últimas Medições");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(217:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (215:43) 
    function create_if_block_7(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Consumo Semanal");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(215:43) ",
    		ctx
    	});

    	return block;
    }

    // (213:5) {#if selectedPeriod === 'monthly'}
    function create_if_block_6(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Consumo Mensal");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(213:5) {#if selectedPeriod === 'monthly'}",
    		ctx
    	});

    	return block;
    }

    // (250:4) {:else}
    function create_else_block_2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Nenhum dado disponível para o período selecionado.";
    			attr_dev(p, "class", "text-center text-muted");
    			add_location(p, file$1, 250, 5, 6891);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(250:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (222:4) {#if chartData.length > 0}
    function create_if_block_2$1(ctx) {
    	let div;
    	let each_value_1 = /*chartData*/ ctx[4];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "chart-container svelte-mfoj8f");
    			add_location(div, file$1, 222, 5, 6009);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*chartData, Math, selectedPeriod, Date*/ 24) {
    				each_value_1 = /*chartData*/ ctx[4];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(222:4) {#if chartData.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (231:9) {:else}
    function create_else_block_1(ctx) {
    	let t_value = new Date(/*item*/ ctx[17].date).toLocaleDateString('pt-BR') + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*chartData*/ 16 && t_value !== (t_value = new Date(/*item*/ ctx[17].date).toLocaleDateString('pt-BR') + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(231:9) {:else}",
    		ctx
    	});

    	return block;
    }

    // (229:47) 
    function create_if_block_5(ctx) {
    	let t_value = new Date(/*item*/ ctx[17].week).toLocaleDateString('pt-BR') + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*chartData*/ 16 && t_value !== (t_value = new Date(/*item*/ ctx[17].week).toLocaleDateString('pt-BR') + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(229:47) ",
    		ctx
    	});

    	return block;
    }

    // (227:9) {#if selectedPeriod === 'monthly'}
    function create_if_block_4(ctx) {
    	let t_value = /*item*/ ctx[17].month + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*chartData*/ 16 && t_value !== (t_value = /*item*/ ctx[17].month + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(227:9) {#if selectedPeriod === 'monthly'}",
    		ctx
    	});

    	return block;
    }

    // (242:10) {#if item.count > 1}
    function create_if_block_3$1(ctx) {
    	let small;
    	let t0;
    	let t1_value = /*item*/ ctx[17].count + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			small = element("small");
    			t0 = text("(");
    			t1 = text(t1_value);
    			t2 = text(" medições)");
    			add_location(small, file$1, 242, 11, 6747);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, small, anchor);
    			append_dev(small, t0);
    			append_dev(small, t1);
    			append_dev(small, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*chartData*/ 16 && t1_value !== (t1_value = /*item*/ ctx[17].count + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(small);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(242:10) {#if item.count > 1}",
    		ctx
    	});

    	return block;
    }

    // (224:6) {#each chartData as item, index}
    function create_each_block_1(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div2;
    	let div1;
    	let t1;
    	let span;
    	let t2_value = /*item*/ ctx[17].consumption.toFixed(1) + "";
    	let t2;
    	let t3;
    	let t4;

    	function select_block_type_4(ctx, dirty) {
    		if (/*selectedPeriod*/ ctx[3] === 'monthly') return create_if_block_4;
    		if (/*selectedPeriod*/ ctx[3] === 'weekly') return create_if_block_5;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_4(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*item*/ ctx[17].count > 1 && create_if_block_3$1(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			t1 = space();
    			span = element("span");
    			t2 = text(t2_value);
    			t3 = text(" L\n\t\t\t\t\t\t\t\t\t\t");
    			if (if_block1) if_block1.c();
    			t4 = space();
    			attr_dev(div0, "class", "bar-label svelte-mfoj8f");
    			add_location(div0, file$1, 225, 8, 6117);
    			attr_dev(div1, "class", "bar svelte-mfoj8f");
    			set_style(div1, "width", Math.max(5, /*item*/ ctx[17].consumption / Math.max(.../*chartData*/ ctx[4].map(func)) * 100) + "%");
    			add_location(div1, file$1, 235, 9, 6468);
    			attr_dev(span, "class", "bar-value svelte-mfoj8f");
    			add_location(span, file$1, 239, 9, 6638);
    			attr_dev(div2, "class", "bar-container svelte-mfoj8f");
    			add_location(div2, file$1, 234, 8, 6431);
    			attr_dev(div3, "class", "chart-bar svelte-mfoj8f");
    			add_location(div3, file$1, 224, 7, 6085);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			if_block0.m(div0, null);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div2, t1);
    			append_dev(div2, span);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			if (if_block1) if_block1.m(span, null);
    			append_dev(div3, t4);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_4(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			}

    			if (dirty & /*chartData*/ 16) {
    				set_style(div1, "width", Math.max(5, /*item*/ ctx[17].consumption / Math.max(.../*chartData*/ ctx[4].map(func)) * 100) + "%");
    			}

    			if (dirty & /*chartData*/ 16 && t2_value !== (t2_value = /*item*/ ctx[17].consumption.toFixed(1) + "")) set_data_dev(t2, t2_value);

    			if (/*item*/ ctx[17].count > 1) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3$1(ctx);
    					if_block1.c();
    					if_block1.m(span, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(224:6) {#each chartData as item, index}",
    		ctx
    	});

    	return block;
    }

    // (256:3) {#if topConsumers.length > 0}
    function create_if_block_1$1(ctx) {
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t3;
    	let th1;
    	let t5;
    	let th2;
    	let t7;
    	let th3;
    	let t9;
    	let th4;
    	let t11;
    	let tbody;
    	let each_value = /*topConsumers*/ ctx[5];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Maiores Consumidores";
    			t1 = space();
    			div0 = element("div");
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "Hidrômetro";
    			t3 = space();
    			th1 = element("th");
    			th1.textContent = "Localização";
    			t5 = space();
    			th2 = element("th");
    			th2.textContent = "Consumo Total (L)";
    			t7 = space();
    			th3 = element("th");
    			th3.textContent = "Medições";
    			t9 = space();
    			th4 = element("th");
    			th4.textContent = "Média (L)";
    			t11 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h2, "class", "mb-3");
    			add_location(h2, file$1, 257, 5, 7088);
    			add_location(th0, file$1, 262, 9, 7231);
    			add_location(th1, file$1, 263, 9, 7260);
    			add_location(th2, file$1, 264, 9, 7290);
    			add_location(th3, file$1, 265, 9, 7326);
    			add_location(th4, file$1, 266, 9, 7353);
    			add_location(tr, file$1, 261, 8, 7217);
    			add_location(thead, file$1, 260, 7, 7201);
    			add_location(tbody, file$1, 269, 7, 7409);
    			attr_dev(table, "class", "table");
    			add_location(table, file$1, 259, 6, 7172);
    			attr_dev(div0, "class", "table-container");
    			add_location(div0, file$1, 258, 5, 7136);
    			attr_dev(div1, "class", "card");
    			add_location(div1, file$1, 256, 4, 7064);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h2);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, table);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t3);
    			append_dev(tr, th1);
    			append_dev(tr, t5);
    			append_dev(tr, th2);
    			append_dev(tr, t7);
    			append_dev(tr, th3);
    			append_dev(tr, t9);
    			append_dev(tr, th4);
    			append_dev(table, t11);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(tbody, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*topConsumers*/ 32) {
    				each_value = /*topConsumers*/ ctx[5];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(256:3) {#if topConsumers.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (271:8) {#each topConsumers as consumer}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*consumer*/ ctx[14].meterNumber + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = (/*consumer*/ ctx[14].location || '-') + "";
    	let t2;
    	let t3;
    	let td2;
    	let strong;
    	let t4_value = /*consumer*/ ctx[14].totalConsumption.toFixed(1) + "";
    	let t4;
    	let t5;
    	let td3;
    	let t6_value = /*consumer*/ ctx[14].count + "";
    	let t6;
    	let t7;
    	let td4;
    	let t8_value = (/*consumer*/ ctx[14].totalConsumption / /*consumer*/ ctx[14].count).toFixed(1) + "";
    	let t8;
    	let t9;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			strong = element("strong");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			td4 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			add_location(td0, file$1, 272, 10, 7482);
    			add_location(td1, file$1, 273, 10, 7524);
    			add_location(strong, file$1, 274, 14, 7574);
    			add_location(td2, file$1, 274, 10, 7570);
    			add_location(td3, file$1, 275, 10, 7645);
    			add_location(td4, file$1, 276, 10, 7681);
    			add_location(tr, file$1, 271, 9, 7467);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, strong);
    			append_dev(strong, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			append_dev(td3, t6);
    			append_dev(tr, t7);
    			append_dev(tr, td4);
    			append_dev(td4, t8);
    			append_dev(tr, t9);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*topConsumers*/ 32 && t0_value !== (t0_value = /*consumer*/ ctx[14].meterNumber + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*topConsumers*/ 32 && t2_value !== (t2_value = (/*consumer*/ ctx[14].location || '-') + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*topConsumers*/ 32 && t4_value !== (t4_value = /*consumer*/ ctx[14].totalConsumption.toFixed(1) + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*topConsumers*/ 32 && t6_value !== (t6_value = /*consumer*/ ctx[14].count + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*topConsumers*/ 32 && t8_value !== (t8_value = (/*consumer*/ ctx[14].totalConsumption / /*consumer*/ ctx[14].count).toFixed(1) + "")) set_data_dev(t8, t8_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(271:8) {#each topConsumers as consumer}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div3;
    	let div2;
    	let div1;
    	let h1;
    	let t1;
    	let div0;
    	let label;
    	let t3;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let t7;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*measurements*/ ctx[0].length === 0) return create_if_block$1;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Relatórios e Análises";
    			t1 = space();
    			div0 = element("div");
    			label = element("label");
    			label.textContent = "Período de Análise:";
    			t3 = space();
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Últimas 10 Medições";
    			option1 = element("option");
    			option1.textContent = "Por Semana";
    			option2 = element("option");
    			option2.textContent = "Por Mês";
    			t7 = space();
    			if_block.c();
    			attr_dev(h1, "class", "mb-3");
    			add_location(h1, file$1, 159, 3, 4206);
    			attr_dev(label, "class", "form-label");
    			add_location(label, file$1, 162, 4, 4291);
    			option0.__value = "all";
    			option0.value = option0.__value;
    			add_location(option0, file$1, 164, 5, 4411);
    			option1.__value = "weekly";
    			option1.value = option1.__value;
    			add_location(option1, file$1, 165, 5, 4465);
    			option2.__value = "monthly";
    			option2.value = option2.__value;
    			add_location(option2, file$1, 166, 5, 4513);
    			attr_dev(select, "class", "form-select");
    			if (/*selectedPeriod*/ ctx[3] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[8].call(select));
    			add_location(select, file$1, 163, 4, 4349);
    			attr_dev(div0, "class", "period-selector svelte-mfoj8f");
    			add_location(div0, file$1, 161, 3, 4257);
    			attr_dev(div1, "class", "reports-header svelte-mfoj8f");
    			add_location(div1, file$1, 158, 2, 4174);
    			attr_dev(div2, "class", "card");
    			add_location(div2, file$1, 157, 1, 4153);
    			attr_dev(div3, "class", "reports svelte-mfoj8f");
    			add_location(div3, file$1, 156, 0, 4130);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h1);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, label);
    			append_dev(div0, t3);
    			append_dev(div0, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			select_option(select, /*selectedPeriod*/ ctx[3], true);
    			append_dev(div2, t7);
    			if_block.m(div2, null);

    			if (!mounted) {
    				dispose = listen_dev(select, "change", /*select_change_handler*/ ctx[8]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*selectedPeriod*/ 8) {
    				select_option(select, /*selectedPeriod*/ ctx[3]);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div2, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const func = d => d.consumption;

    function instance$1($$self, $$props, $$invalidate) {
    	let trend;
    	let topConsumers;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Reports', slots, []);
    	let { measurements } = $$props;
    	let { totalConsumption } = $$props;
    	let { averageConsumption } = $$props;
    	let selectedPeriod = 'all';
    	let chartData = [];
    	let monthlyData = [];
    	let weeklyData = [];

    	function updateChartData() {
    		if (measurements.length === 0) {
    			$$invalidate(4, chartData = []);
    			monthlyData = [];
    			weeklyData = [];
    			return;
    		}

    		// Group by month
    		const monthly = {};

    		measurements.forEach(measurement => {
    			const date = new Date(measurement.date);
    			const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    			if (!monthly[monthKey]) {
    				monthly[monthKey] = {
    					month: monthKey,
    					consumption: 0,
    					count: 0
    				};
    			}

    			monthly[monthKey].consumption += measurement.consumption;
    			monthly[monthKey].count += 1;
    		});

    		monthlyData = Object.values(monthly).sort((a, b) => a.month.localeCompare(b.month));

    		// Group by week (last 8 weeks)
    		const weekly = {};

    		const now = new Date();

    		for (let i = 7; i >= 0; i--) {
    			const weekStart = new Date(now);
    			weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 7 * i));
    			weekStart.setHours(0, 0, 0, 0);
    			const weekEnd = new Date(weekStart);
    			weekEnd.setDate(weekEnd.getDate() + 6);
    			weekEnd.setHours(23, 59, 59, 999);
    			const weekKey = weekStart.toISOString().split('T')[0];
    			weekly[weekKey] = { week: weekKey, consumption: 0, count: 0 };
    		}

    		measurements.forEach(measurement => {
    			const date = new Date(measurement.date);
    			const weekStart = new Date(date);
    			weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    			weekStart.setHours(0, 0, 0, 0);
    			const weekKey = weekStart.toISOString().split('T')[0];

    			if (weekly[weekKey]) {
    				weekly[weekKey].consumption += measurement.consumption;
    				weekly[weekKey].count += 1;
    			}
    		});

    		weeklyData = Object.values(weekly).sort((a, b) => a.week.localeCompare(b.week));

    		// Update chart data based on selected period
    		if (selectedPeriod === 'monthly') {
    			$$invalidate(4, chartData = monthlyData);
    		} else if (selectedPeriod === 'weekly') {
    			$$invalidate(4, chartData = weeklyData);
    		} else {
    			$$invalidate(4, chartData = measurements.slice(-10).reverse());
    		}
    	}

    	function getConsumptionTrend() {
    		if (measurements.length < 2) return 'stable';
    		const recent = measurements.slice(-3);
    		const older = measurements.slice(-6, -3);
    		if (recent.length === 0 || older.length === 0) return 'stable';
    		const recentAvg = recent.reduce((sum, m) => sum + m.consumption, 0) / recent.length;
    		const olderAvg = older.reduce((sum, m) => sum + m.consumption, 0) / older.length;
    		const change = (recentAvg - olderAvg) / olderAvg * 100;
    		if (change > 10) return 'increasing';
    		if (change < -10) return 'decreasing';
    		return 'stable';
    	}

    	function getTopConsumers() {
    		const consumers = {};

    		measurements.forEach(measurement => {
    			const key = measurement.meterNumber;

    			if (!consumers[key]) {
    				consumers[key] = {
    					meterNumber: key,
    					location: measurement.location,
    					totalConsumption: 0,
    					count: 0
    				};
    			}

    			consumers[key].totalConsumption += measurement.consumption;
    			consumers[key].count += 1;
    		});

    		return Object.values(consumers).sort((a, b) => b.totalConsumption - a.totalConsumption).slice(0, 5);
    	}

    	function exportReport() {
    		const report = {
    			generatedAt: new Date().toISOString(),
    			summary: {
    				totalMeasurements: measurements.length,
    				totalConsumption,
    				averageConsumption,
    				trend: getConsumptionTrend()
    			},
    			monthlyData,
    			weeklyData,
    			topConsumers: getTopConsumers()
    		};

    		const dataStr = JSON.stringify(report, null, 2);
    		const dataBlob = new Blob([dataStr], { type: 'application/json' });
    		const url = URL.createObjectURL(dataBlob);
    		const link = document.createElement('a');
    		link.href = url;
    		link.download = `cagece-relatorio-${new Date().toISOString().split('T')[0]}.json`;
    		link.click();
    		URL.revokeObjectURL(url);
    	}

    	$$self.$$.on_mount.push(function () {
    		if (measurements === undefined && !('measurements' in $$props || $$self.$$.bound[$$self.$$.props['measurements']])) {
    			console.warn("<Reports> was created without expected prop 'measurements'");
    		}

    		if (totalConsumption === undefined && !('totalConsumption' in $$props || $$self.$$.bound[$$self.$$.props['totalConsumption']])) {
    			console.warn("<Reports> was created without expected prop 'totalConsumption'");
    		}

    		if (averageConsumption === undefined && !('averageConsumption' in $$props || $$self.$$.bound[$$self.$$.props['averageConsumption']])) {
    			console.warn("<Reports> was created without expected prop 'averageConsumption'");
    		}
    	});

    	const writable_props = ['measurements', 'totalConsumption', 'averageConsumption'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Reports> was created with unknown prop '${key}'`);
    	});

    	function select_change_handler() {
    		selectedPeriod = select_value(this);
    		$$invalidate(3, selectedPeriod);
    	}

    	$$self.$$set = $$props => {
    		if ('measurements' in $$props) $$invalidate(0, measurements = $$props.measurements);
    		if ('totalConsumption' in $$props) $$invalidate(1, totalConsumption = $$props.totalConsumption);
    		if ('averageConsumption' in $$props) $$invalidate(2, averageConsumption = $$props.averageConsumption);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		measurements,
    		totalConsumption,
    		averageConsumption,
    		selectedPeriod,
    		chartData,
    		monthlyData,
    		weeklyData,
    		updateChartData,
    		getConsumptionTrend,
    		getTopConsumers,
    		exportReport,
    		topConsumers,
    		trend
    	});

    	$$self.$inject_state = $$props => {
    		if ('measurements' in $$props) $$invalidate(0, measurements = $$props.measurements);
    		if ('totalConsumption' in $$props) $$invalidate(1, totalConsumption = $$props.totalConsumption);
    		if ('averageConsumption' in $$props) $$invalidate(2, averageConsumption = $$props.averageConsumption);
    		if ('selectedPeriod' in $$props) $$invalidate(3, selectedPeriod = $$props.selectedPeriod);
    		if ('chartData' in $$props) $$invalidate(4, chartData = $$props.chartData);
    		if ('monthlyData' in $$props) monthlyData = $$props.monthlyData;
    		if ('weeklyData' in $$props) weeklyData = $$props.weeklyData;
    		if ('topConsumers' in $$props) $$invalidate(5, topConsumers = $$props.topConsumers);
    		if ('trend' in $$props) $$invalidate(6, trend = $$props.trend);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	{
    		updateChartData();
    	}

    	$$invalidate(6, trend = getConsumptionTrend());
    	$$invalidate(5, topConsumers = getTopConsumers());

    	return [
    		measurements,
    		totalConsumption,
    		averageConsumption,
    		selectedPeriod,
    		chartData,
    		topConsumers,
    		trend,
    		exportReport,
    		select_change_handler
    	];
    }

    class Reports extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			measurements: 0,
    			totalConsumption: 1,
    			averageConsumption: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Reports",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get measurements() {
    		throw new Error("<Reports>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set measurements(value) {
    		throw new Error("<Reports>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get totalConsumption() {
    		throw new Error("<Reports>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set totalConsumption(value) {
    		throw new Error("<Reports>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get averageConsumption() {
    		throw new Error("<Reports>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set averageConsumption(value) {
    		throw new Error("<Reports>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */
    const file = "src/App.svelte";

    // (81:38) 
    function create_if_block_3(ctx) {
    	let reports;
    	let current;

    	reports = new Reports({
    			props: {
    				measurements: /*measurements*/ ctx[1],
    				totalConsumption: /*totalConsumption*/ ctx[2],
    				averageConsumption: /*averageConsumption*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(reports.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(reports, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const reports_changes = {};
    			if (dirty & /*measurements*/ 2) reports_changes.measurements = /*measurements*/ ctx[1];
    			if (dirty & /*totalConsumption*/ 4) reports_changes.totalConsumption = /*totalConsumption*/ ctx[2];
    			if (dirty & /*averageConsumption*/ 8) reports_changes.averageConsumption = /*averageConsumption*/ ctx[3];
    			reports.$set(reports_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(reports.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(reports.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(reports, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(81:38) ",
    		ctx
    	});

    	return block;
    }

    // (79:38) 
    function create_if_block_2(ctx) {
    	let history;
    	let current;

    	history = new History({
    			props: {
    				measurements: /*measurements*/ ctx[1],
    				deleteMeasurement: /*deleteMeasurement*/ ctx[6]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(history.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(history, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const history_changes = {};
    			if (dirty & /*measurements*/ 2) history_changes.measurements = /*measurements*/ ctx[1];
    			history.$set(history_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(history.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(history.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(history, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(79:38) ",
    		ctx
    	});

    	return block;
    }

    // (77:42) 
    function create_if_block_1(ctx) {
    	let measurementform;
    	let current;

    	measurementform = new MeasurementForm({
    			props: {
    				addMeasurement: /*addMeasurement*/ ctx[5]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(measurementform.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(measurementform, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(measurementform.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(measurementform.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(measurementform, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(77:42) ",
    		ctx
    	});

    	return block;
    }

    // (70:2) {#if currentView === 'dashboard'}
    function create_if_block(ctx) {
    	let dashboard;
    	let current;

    	dashboard = new Dashboard({
    			props: {
    				measurements: /*measurements*/ ctx[1],
    				totalConsumption: /*totalConsumption*/ ctx[2],
    				averageConsumption: /*averageConsumption*/ ctx[3],
    				lastMeasurement: /*lastMeasurement*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(dashboard.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(dashboard, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const dashboard_changes = {};
    			if (dirty & /*measurements*/ 2) dashboard_changes.measurements = /*measurements*/ ctx[1];
    			if (dirty & /*totalConsumption*/ 4) dashboard_changes.totalConsumption = /*totalConsumption*/ ctx[2];
    			if (dirty & /*averageConsumption*/ 8) dashboard_changes.averageConsumption = /*averageConsumption*/ ctx[3];
    			if (dirty & /*lastMeasurement*/ 16) dashboard_changes.lastMeasurement = /*lastMeasurement*/ ctx[4];
    			dashboard.$set(dashboard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dashboard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dashboard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dashboard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(70:2) {#if currentView === 'dashboard'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let header;
    	let t;
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;

    	header = new Header({
    			props: {
    				currentView: /*currentView*/ ctx[0],
    				setView: /*setView*/ ctx[7]
    			},
    			$$inline: true
    		});

    	const if_block_creators = [create_if_block, create_if_block_1, create_if_block_2, create_if_block_3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*currentView*/ ctx[0] === 'dashboard') return 0;
    		if (/*currentView*/ ctx[0] === 'measurement') return 1;
    		if (/*currentView*/ ctx[0] === 'history') return 2;
    		if (/*currentView*/ ctx[0] === 'reports') return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(header.$$.fragment);
    			t = space();
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "container");
    			add_location(div, file, 68, 1, 1761);
    			attr_dev(main, "class", "svelte-ct83oo");
    			add_location(main, file, 65, 0, 1715);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t);
    			append_dev(main, div);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const header_changes = {};
    			if (dirty & /*currentView*/ 1) header_changes.currentView = /*currentView*/ ctx[0];
    			header.$set(header_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(header);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let currentView = 'dashboard';
    	let measurements = [];
    	let totalConsumption = 0;
    	let averageConsumption = 0;
    	let lastMeasurement = null;

    	// Load data from localStorage on mount
    	onMount(() => {
    		const savedMeasurements = localStorage.getItem('cagece-measurements');

    		if (savedMeasurements) {
    			$$invalidate(1, measurements = JSON.parse(savedMeasurements));
    			updateStats();
    		}
    	});

    	function updateStats() {
    		if (measurements.length === 0) {
    			$$invalidate(2, totalConsumption = 0);
    			$$invalidate(3, averageConsumption = 0);
    			$$invalidate(4, lastMeasurement = null);
    			return;
    		}

    		// Calculate total consumption
    		$$invalidate(2, totalConsumption = measurements.reduce((sum, measurement) => sum + measurement.consumption, 0));

    		// Calculate average consumption
    		$$invalidate(3, averageConsumption = totalConsumption / measurements.length);

    		// Get last measurement
    		$$invalidate(4, lastMeasurement = measurements[measurements.length - 1]);
    	}

    	function addMeasurement(measurement) {
    		$$invalidate(1, measurements = [
    			...measurements,
    			{
    				...measurement,
    				id: Date.now(),
    				date: new Date().toISOString()
    			}
    		]);

    		// Save to localStorage
    		localStorage.setItem('cagece-measurements', JSON.stringify(measurements));

    		updateStats();
    	}

    	function deleteMeasurement(id) {
    		$$invalidate(1, measurements = measurements.filter(m => m.id !== id));
    		localStorage.setItem('cagece-measurements', JSON.stringify(measurements));
    		updateStats();
    	}

    	function setView(view) {
    		$$invalidate(0, currentView = view);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		Header,
    		Dashboard,
    		MeasurementForm,
    		History,
    		Reports,
    		currentView,
    		measurements,
    		totalConsumption,
    		averageConsumption,
    		lastMeasurement,
    		updateStats,
    		addMeasurement,
    		deleteMeasurement,
    		setView
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentView' in $$props) $$invalidate(0, currentView = $$props.currentView);
    		if ('measurements' in $$props) $$invalidate(1, measurements = $$props.measurements);
    		if ('totalConsumption' in $$props) $$invalidate(2, totalConsumption = $$props.totalConsumption);
    		if ('averageConsumption' in $$props) $$invalidate(3, averageConsumption = $$props.averageConsumption);
    		if ('lastMeasurement' in $$props) $$invalidate(4, lastMeasurement = $$props.lastMeasurement);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		currentView,
    		measurements,
    		totalConsumption,
    		averageConsumption,
    		lastMeasurement,
    		addMeasurement,
    		deleteMeasurement,
    		setView
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'CAGECE'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
