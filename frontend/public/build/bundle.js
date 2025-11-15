
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
    function empty() {
        return text('');
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

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const createAuth = () => {
        const { subscribe, set } = writable({ token: null });

        return {
            subscribe,
            login: (token) => {
                localStorage.setItem('token', token);
                set({ token });
            },
            logout: () => {
                localStorage.removeItem('token');
                set({ token: null });
            },
            init: () => {
                const token = localStorage.getItem('token');
                if (token) {
                    set({ token });
                }
            }
        };
    };

    const auth = createAuth();

    /* src/components/Header.svelte generated by Svelte v3.59.2 */
    const file$8 = "src/components/Header.svelte";

    // (55:4) {:else}
    function create_else_block$4(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Sign Up";
    			attr_dev(button, "class", "px-3 py-2 rounded-md hover:bg-blue-700 transition-colors");
    			toggle_class(button, "bg-blue-700", /*currentView*/ ctx[0] === 'signup');
    			add_location(button, file$8, 55, 5, 1527);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_4*/ ctx[8], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentView*/ 1) {
    				toggle_class(button, "bg-blue-700", /*currentView*/ ctx[0] === 'signup');
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(55:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (20:4) {#if isAuthenticated}
    function create_if_block$5(ctx) {
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let t5;
    	let button3;
    	let t7;
    	let button4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "📊 Dashboard";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "📝 Nova Medição";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "📋 Histórico";
    			t5 = space();
    			button3 = element("button");
    			button3.textContent = "📈 Relatórios";
    			t7 = space();
    			button4 = element("button");
    			button4.textContent = "Logout";
    			attr_dev(button0, "class", "px-3 py-2 rounded-md hover:bg-blue-700 transition-colors");
    			toggle_class(button0, "bg-blue-700", /*currentView*/ ctx[0] === 'dashboard');
    			add_location(button0, file$8, 20, 5, 470);
    			attr_dev(button1, "class", "px-3 py-2 rounded-md hover:bg-blue-700 transition-colors");
    			toggle_class(button1, "bg-blue-700", /*currentView*/ ctx[0] === 'measurement');
    			add_location(button1, file$8, 27, 5, 695);
    			attr_dev(button2, "class", "px-3 py-2 rounded-md hover:bg-blue-700 transition-colors");
    			toggle_class(button2, "bg-blue-700", /*currentView*/ ctx[0] === 'history');
    			add_location(button2, file$8, 34, 5, 927);
    			attr_dev(button3, "class", "px-3 py-2 rounded-md hover:bg-blue-700 transition-colors");
    			toggle_class(button3, "bg-blue-700", /*currentView*/ ctx[0] === 'reports');
    			add_location(button3, file$8, 41, 5, 1148);
    			attr_dev(button4, "class", "px-3 py-2 rounded-md hover:bg-blue-700 transition-colors");
    			add_location(button4, file$8, 48, 5, 1370);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, button2, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, button3, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, button4, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[4], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[5], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[6], false, false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[7], false, false, false, false),
    					listen_dev(button4, "click", /*logout*/ ctx[3], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentView*/ 1) {
    				toggle_class(button0, "bg-blue-700", /*currentView*/ ctx[0] === 'dashboard');
    			}

    			if (dirty & /*currentView*/ 1) {
    				toggle_class(button1, "bg-blue-700", /*currentView*/ ctx[0] === 'measurement');
    			}

    			if (dirty & /*currentView*/ 1) {
    				toggle_class(button2, "bg-blue-700", /*currentView*/ ctx[0] === 'history');
    			}

    			if (dirty & /*currentView*/ 1) {
    				toggle_class(button3, "bg-blue-700", /*currentView*/ ctx[0] === 'reports');
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(button2);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(button3);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(button4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(20:4) {#if isAuthenticated}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let header;
    	let div2;
    	let div1;
    	let div0;
    	let t1;
    	let nav;

    	function select_block_type(ctx, dirty) {
    		if (/*isAuthenticated*/ ctx[2]) return create_if_block$5;
    		return create_else_block$4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			header = element("header");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "💧 Mediagua - Serviço de Medição de Água";
    			t1 = space();
    			nav = element("nav");
    			if_block.c();
    			attr_dev(div0, "class", "text-2xl font-bold");
    			add_location(div0, file$8, 14, 3, 315);
    			attr_dev(nav, "class", "flex space-x-4");
    			add_location(nav, file$8, 18, 3, 410);
    			attr_dev(div1, "class", "flex justify-between items-center");
    			add_location(div1, file$8, 13, 2, 264);
    			attr_dev(div2, "class", "container mx-auto");
    			add_location(div2, file$8, 12, 1, 230);
    			attr_dev(header, "class", "bg-blue-600 text-white p-4 shadow-md");
    			add_location(header, file$8, 11, 0, 175);
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
    			if_block.m(nav, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(nav, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	let { currentView } = $$props;
    	let { setView } = $$props;
    	let { isAuthenticated } = $$props;

    	function logout() {
    		auth.logout();
    	}

    	$$self.$$.on_mount.push(function () {
    		if (currentView === undefined && !('currentView' in $$props || $$self.$$.bound[$$self.$$.props['currentView']])) {
    			console.warn("<Header> was created without expected prop 'currentView'");
    		}

    		if (setView === undefined && !('setView' in $$props || $$self.$$.bound[$$self.$$.props['setView']])) {
    			console.warn("<Header> was created without expected prop 'setView'");
    		}

    		if (isAuthenticated === undefined && !('isAuthenticated' in $$props || $$self.$$.bound[$$self.$$.props['isAuthenticated']])) {
    			console.warn("<Header> was created without expected prop 'isAuthenticated'");
    		}
    	});

    	const writable_props = ['currentView', 'setView', 'isAuthenticated'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => setView('dashboard');
    	const click_handler_1 = () => setView('measurement');
    	const click_handler_2 = () => setView('history');
    	const click_handler_3 = () => setView('reports');
    	const click_handler_4 = () => setView('signup');

    	$$self.$$set = $$props => {
    		if ('currentView' in $$props) $$invalidate(0, currentView = $$props.currentView);
    		if ('setView' in $$props) $$invalidate(1, setView = $$props.setView);
    		if ('isAuthenticated' in $$props) $$invalidate(2, isAuthenticated = $$props.isAuthenticated);
    	};

    	$$self.$capture_state = () => ({
    		auth,
    		currentView,
    		setView,
    		isAuthenticated,
    		logout
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentView' in $$props) $$invalidate(0, currentView = $$props.currentView);
    		if ('setView' in $$props) $$invalidate(1, setView = $$props.setView);
    		if ('isAuthenticated' in $$props) $$invalidate(2, isAuthenticated = $$props.isAuthenticated);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		currentView,
    		setView,
    		isAuthenticated,
    		logout,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			currentView: 0,
    			setView: 1,
    			isAuthenticated: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$8.name
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

    	get isAuthenticated() {
    		throw new Error("<Header>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isAuthenticated(value) {
    		throw new Error("<Header>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Dashboard.svelte generated by Svelte v3.59.2 */

    const file$7 = "src/components/Dashboard.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[10] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (16:1) {#if currentUser && currentUser.appliances && currentUser.appliances.length > 0}
    function create_if_block_4$2(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let ul;
    	let each_value_1 = /*currentUser*/ ctx[5].appliances;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Meus Eletrodomésticos";
    			t1 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h2, "class", "text-2xl font-semibold mb-4 text-gray-700");
    			add_location(h2, file$7, 17, 2, 540);
    			attr_dev(ul, "class", "list-disc list-inside");
    			add_location(ul, file$7, 18, 2, 623);
    			attr_dev(div, "class", "bg-white p-6 rounded-lg shadow-md mb-8");
    			add_location(div, file$7, 16, 1, 485);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t1);
    			append_dev(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(ul, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentUser*/ 32) {
    				each_value_1 = /*currentUser*/ ctx[5].appliances;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
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
    		id: create_if_block_4$2.name,
    		type: "if",
    		source: "(16:1) {#if currentUser && currentUser.appliances && currentUser.appliances.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (20:3) {#each currentUser.appliances as appliance}
    function create_each_block_1$1(ctx) {
    	let li;
    	let t_value = /*appliance*/ ctx[13].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			add_location(li, file$7, 20, 4, 709);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentUser*/ 32 && t_value !== (t_value = /*appliance*/ ctx[13].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(20:3) {#each currentUser.appliances as appliance}",
    		ctx
    	});

    	return block;
    }

    // (48:4) {:else}
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
    		source: "(48:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (46:4) {#if lastMeasurement}
    function create_if_block_3$2(ctx) {
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
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(46:4) {#if lastMeasurement}",
    		ctx
    	});

    	return block;
    }

    // (65:2) {:else}
    function create_else_block$3(ctx) {
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
    	let each_value = /*recentMeasurements*/ ctx[6];
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

    			attr_dev(th0, "class", "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider");
    			add_location(th0, file$7, 69, 7, 2400);
    			attr_dev(th1, "class", "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider");
    			add_location(th1, file$7, 70, 7, 2508);
    			attr_dev(th2, "class", "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider");
    			add_location(th2, file$7, 71, 7, 2622);
    			attr_dev(th3, "class", "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider");
    			add_location(th3, file$7, 72, 7, 2737);
    			attr_dev(tr, "class", "bg-gray-200");
    			add_location(tr, file$7, 68, 6, 2368);
    			add_location(thead, file$7, 67, 5, 2354);
    			add_location(tbody, file$7, 75, 5, 2871);
    			attr_dev(table, "class", "min-w-full bg-white");
    			add_location(table, file$7, 66, 4, 2313);
    			attr_dev(div, "class", "overflow-x-auto");
    			add_location(div, file$7, 65, 3, 2279);
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
    			if (dirty & /*recentMeasurements, averageConsumption, Date*/ 68) {
    				each_value = /*recentMeasurements*/ ctx[6];
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
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(65:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (60:2) {#if recentMeasurements.length === 0}
    function create_if_block$4(ctx) {
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
    			attr_dev(p0, "class", "mb-2");
    			add_location(p0, file$7, 61, 4, 2152);
    			add_location(p1, file$7, 62, 4, 2210);
    			attr_dev(div, "class", "text-center text-gray-600 py-8");
    			add_location(div, file$7, 60, 3, 2103);
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
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(60:2) {#if recentMeasurements.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (88:10) {:else}
    function create_else_block_1$1(ctx) {
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
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(88:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (86:71) 
    function create_if_block_2$2(ctx) {
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
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(86:71) ",
    		ctx
    	});

    	return block;
    }

    // (84:10) {#if measurement.consumption <= averageConsumption}
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
    		source: "(84:10) {#if measurement.consumption <= averageConsumption}",
    		ctx
    	});

    	return block;
    }

    // (77:6) {#each recentMeasurements as measurement}
    function create_each_block$2(ctx) {
    	let tr;
    	let td0;
    	let t0_value = new Date(/*measurement*/ ctx[10].date).toLocaleDateString('pt-BR') + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*measurement*/ ctx[10].meterNumber + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*measurement*/ ctx[10].consumption.toFixed(1) + "";
    	let t4;
    	let t5;
    	let td3;
    	let span;
    	let t6;

    	function select_block_type_2(ctx, dirty) {
    		if (/*measurement*/ ctx[10].consumption <= /*averageConsumption*/ ctx[2]) return create_if_block_1$3;
    		if (/*measurement*/ ctx[10].consumption > /*averageConsumption*/ ctx[2] * 1.5) return create_if_block_2$2;
    		return create_else_block_1$1;
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
    			attr_dev(td0, "class", "px-4 py-3 whitespace-nowrap text-sm text-gray-800");
    			add_location(td0, file$7, 78, 8, 2947);
    			attr_dev(td1, "class", "px-4 py-3 whitespace-nowrap text-sm text-gray-800");
    			add_location(td1, file$7, 79, 8, 3079);
    			attr_dev(td2, "class", "px-4 py-3 whitespace-nowrap text-sm text-gray-800");
    			add_location(td2, file$7, 80, 8, 3180);
    			attr_dev(span, "class", "px-2 inline-flex text-xs leading-5 font-semibold rounded-full");
    			toggle_class(span, "bg-green-100", /*measurement*/ ctx[10].consumption <= /*averageConsumption*/ ctx[2]);
    			toggle_class(span, "text-green-800", /*measurement*/ ctx[10].consumption <= /*averageConsumption*/ ctx[2]);
    			toggle_class(span, "bg-red-100", /*measurement*/ ctx[10].consumption > /*averageConsumption*/ ctx[2] * 1.5);
    			toggle_class(span, "text-red-800", /*measurement*/ ctx[10].consumption > /*averageConsumption*/ ctx[2] * 1.5);
    			toggle_class(span, "bg-yellow-100", /*measurement*/ ctx[10].consumption > /*averageConsumption*/ ctx[2] && /*measurement*/ ctx[10].consumption <= /*averageConsumption*/ ctx[2] * 1.5);
    			toggle_class(span, "text-yellow-800", /*measurement*/ ctx[10].consumption > /*averageConsumption*/ ctx[2] && /*measurement*/ ctx[10].consumption <= /*averageConsumption*/ ctx[2] * 1.5);
    			add_location(span, file$7, 82, 9, 3364);
    			attr_dev(td3, "class", "px-4 py-3 whitespace-nowrap text-sm text-gray-800");
    			add_location(td3, file$7, 81, 8, 3292);
    			add_location(tr, file$7, 77, 7, 2934);
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
    			if (dirty & /*recentMeasurements*/ 64 && t0_value !== (t0_value = new Date(/*measurement*/ ctx[10].date).toLocaleDateString('pt-BR') + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*recentMeasurements*/ 64 && t2_value !== (t2_value = /*measurement*/ ctx[10].meterNumber + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*recentMeasurements*/ 64 && t4_value !== (t4_value = /*measurement*/ ctx[10].consumption.toFixed(1) + "")) set_data_dev(t4, t4_value);

    			if (current_block_type !== (current_block_type = select_block_type_2(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span, null);
    				}
    			}

    			if (dirty & /*recentMeasurements, averageConsumption*/ 68) {
    				toggle_class(span, "bg-green-100", /*measurement*/ ctx[10].consumption <= /*averageConsumption*/ ctx[2]);
    			}

    			if (dirty & /*recentMeasurements, averageConsumption*/ 68) {
    				toggle_class(span, "text-green-800", /*measurement*/ ctx[10].consumption <= /*averageConsumption*/ ctx[2]);
    			}

    			if (dirty & /*recentMeasurements, averageConsumption*/ 68) {
    				toggle_class(span, "bg-red-100", /*measurement*/ ctx[10].consumption > /*averageConsumption*/ ctx[2] * 1.5);
    			}

    			if (dirty & /*recentMeasurements, averageConsumption*/ 68) {
    				toggle_class(span, "text-red-800", /*measurement*/ ctx[10].consumption > /*averageConsumption*/ ctx[2] * 1.5);
    			}

    			if (dirty & /*recentMeasurements, averageConsumption*/ 68) {
    				toggle_class(span, "bg-yellow-100", /*measurement*/ ctx[10].consumption > /*averageConsumption*/ ctx[2] && /*measurement*/ ctx[10].consumption <= /*averageConsumption*/ ctx[2] * 1.5);
    			}

    			if (dirty & /*recentMeasurements, averageConsumption*/ 68) {
    				toggle_class(span, "text-yellow-800", /*measurement*/ ctx[10].consumption > /*averageConsumption*/ ctx[2] && /*measurement*/ ctx[10].consumption <= /*averageConsumption*/ ctx[2] * 1.5);
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
    		source: "(77:6) {#each recentMeasurements as measurement}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div16;
    	let h1;
    	let t1;
    	let t2;
    	let div12;
    	let div2;
    	let div0;
    	let t3_value = /*measurements*/ ctx[0].length + "";
    	let t3;
    	let t4;
    	let div1;
    	let t6;
    	let div5;
    	let div3;
    	let t7_value = /*totalConsumption*/ ctx[1].toFixed(1) + "";
    	let t7;
    	let t8;
    	let div4;
    	let t10;
    	let div8;
    	let div6;
    	let t11_value = /*averageConsumption*/ ctx[2].toFixed(1) + "";
    	let t11;
    	let t12;
    	let div7;
    	let t14;
    	let div11;
    	let div9;
    	let t15;
    	let div10;
    	let t17;
    	let div13;
    	let h20;
    	let t19;
    	let t20;
    	let div15;
    	let h21;
    	let t22;
    	let div14;
    	let button0;
    	let t24;
    	let button1;
    	let t26;
    	let button2;
    	let mounted;
    	let dispose;
    	let if_block0 = /*currentUser*/ ctx[5] && /*currentUser*/ ctx[5].appliances && /*currentUser*/ ctx[5].appliances.length > 0 && create_if_block_4$2(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*lastMeasurement*/ ctx[3]) return create_if_block_3$2;
    		return create_else_block_2$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block1 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*recentMeasurements*/ ctx[6].length === 0) return create_if_block$4;
    		return create_else_block$3;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block2 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			div16 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Dashboard - Medição de Água";
    			t1 = space();
    			if (if_block0) if_block0.c();
    			t2 = space();
    			div12 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t3 = text(t3_value);
    			t4 = space();
    			div1 = element("div");
    			div1.textContent = "Total de Medições";
    			t6 = space();
    			div5 = element("div");
    			div3 = element("div");
    			t7 = text(t7_value);
    			t8 = space();
    			div4 = element("div");
    			div4.textContent = "Consumo Total (L)";
    			t10 = space();
    			div8 = element("div");
    			div6 = element("div");
    			t11 = text(t11_value);
    			t12 = space();
    			div7 = element("div");
    			div7.textContent = "Média de Consumo (L)";
    			t14 = space();
    			div11 = element("div");
    			div9 = element("div");
    			if_block1.c();
    			t15 = space();
    			div10 = element("div");
    			div10.textContent = "Última Medição (L)";
    			t17 = space();
    			div13 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Medições Recentes";
    			t19 = space();
    			if_block2.c();
    			t20 = space();
    			div15 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Ações Rápidas";
    			t22 = space();
    			div14 = element("div");
    			button0 = element("button");
    			button0.textContent = "📝 Nova Medição";
    			t24 = space();
    			button1 = element("button");
    			button1.textContent = "📋 Ver Histórico";
    			t26 = space();
    			button2 = element("button");
    			button2.textContent = "📈 Gerar Relatório";
    			attr_dev(h1, "class", "text-3xl font-bold mb-6 text-gray-800");
    			add_location(h1, file$7, 12, 1, 291);
    			attr_dev(div0, "class", "text-4xl font-bold text-blue-600 mb-1");
    			add_location(div0, file$7, 29, 3, 935);
    			attr_dev(div1, "class", "text-sm text-gray-500 uppercase");
    			add_location(div1, file$7, 30, 3, 1017);
    			attr_dev(div2, "class", "bg-white p-5 rounded-lg shadow-md text-center");
    			add_location(div2, file$7, 28, 2, 872);
    			attr_dev(div3, "class", "text-4xl font-bold text-blue-600 mb-1");
    			add_location(div3, file$7, 34, 3, 1163);
    			attr_dev(div4, "class", "text-sm text-gray-500 uppercase");
    			add_location(div4, file$7, 35, 3, 1253);
    			attr_dev(div5, "class", "bg-white p-5 rounded-lg shadow-md text-center");
    			add_location(div5, file$7, 33, 2, 1100);
    			attr_dev(div6, "class", "text-4xl font-bold text-blue-600 mb-1");
    			add_location(div6, file$7, 39, 3, 1399);
    			attr_dev(div7, "class", "text-sm text-gray-500 uppercase");
    			add_location(div7, file$7, 40, 3, 1491);
    			attr_dev(div8, "class", "bg-white p-5 rounded-lg shadow-md text-center");
    			add_location(div8, file$7, 38, 2, 1336);
    			attr_dev(div9, "class", "text-4xl font-bold text-blue-600 mb-1");
    			add_location(div9, file$7, 44, 3, 1640);
    			attr_dev(div10, "class", "text-sm text-gray-500 uppercase");
    			add_location(div10, file$7, 51, 3, 1806);
    			attr_dev(div11, "class", "bg-white p-5 rounded-lg shadow-md text-center");
    			add_location(div11, file$7, 43, 2, 1577);
    			attr_dev(div12, "class", "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8");
    			add_location(div12, file$7, 27, 1, 798);
    			attr_dev(h20, "class", "text-2xl font-semibold mb-4 text-gray-700");
    			add_location(h20, file$7, 57, 2, 1980);
    			attr_dev(div13, "class", "bg-white p-6 rounded-lg shadow-md mb-8");
    			add_location(div13, file$7, 56, 1, 1925);
    			attr_dev(h21, "class", "text-2xl font-semibold mb-4 text-gray-700");
    			add_location(h21, file$7, 102, 2, 4374);
    			attr_dev(button0, "class", "w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors font-semibold");
    			add_location(button0, file$7, 104, 3, 4504);
    			attr_dev(button1, "class", "w-full bg-gray-200 text-gray-800 p-3 rounded-md hover:bg-gray-300 transition-colors font-semibold");
    			add_location(button1, file$7, 107, 3, 4692);
    			attr_dev(button2, "class", "w-full bg-gray-200 text-gray-800 p-3 rounded-md hover:bg-gray-300 transition-colors font-semibold");
    			add_location(button2, file$7, 110, 3, 4880);
    			attr_dev(div14, "class", "grid grid-cols-1 md:grid-cols-3 gap-4");
    			add_location(div14, file$7, 103, 2, 4449);
    			attr_dev(div15, "class", "bg-white p-6 rounded-lg shadow-md");
    			add_location(div15, file$7, 101, 1, 4324);
    			attr_dev(div16, "class", "p-6");
    			add_location(div16, file$7, 11, 0, 272);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div16, anchor);
    			append_dev(div16, h1);
    			append_dev(div16, t1);
    			if (if_block0) if_block0.m(div16, null);
    			append_dev(div16, t2);
    			append_dev(div16, div12);
    			append_dev(div12, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t3);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div12, t6);
    			append_dev(div12, div5);
    			append_dev(div5, div3);
    			append_dev(div3, t7);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div12, t10);
    			append_dev(div12, div8);
    			append_dev(div8, div6);
    			append_dev(div6, t11);
    			append_dev(div8, t12);
    			append_dev(div8, div7);
    			append_dev(div12, t14);
    			append_dev(div12, div11);
    			append_dev(div11, div9);
    			if_block1.m(div9, null);
    			append_dev(div11, t15);
    			append_dev(div11, div10);
    			append_dev(div16, t17);
    			append_dev(div16, div13);
    			append_dev(div13, h20);
    			append_dev(div13, t19);
    			if_block2.m(div13, null);
    			append_dev(div16, t20);
    			append_dev(div16, div15);
    			append_dev(div15, h21);
    			append_dev(div15, t22);
    			append_dev(div15, div14);
    			append_dev(div14, button0);
    			append_dev(div14, t24);
    			append_dev(div14, button1);
    			append_dev(div14, t26);
    			append_dev(div14, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[7], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[8], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[9], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*currentUser*/ ctx[5] && /*currentUser*/ ctx[5].appliances && /*currentUser*/ ctx[5].appliances.length > 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_4$2(ctx);
    					if_block0.c();
    					if_block0.m(div16, t2);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*measurements*/ 1 && t3_value !== (t3_value = /*measurements*/ ctx[0].length + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*totalConsumption*/ 2 && t7_value !== (t7_value = /*totalConsumption*/ ctx[1].toFixed(1) + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*averageConsumption*/ 4 && t11_value !== (t11_value = /*averageConsumption*/ ctx[2].toFixed(1) + "")) set_data_dev(t11, t11_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div9, null);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type_1(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div13, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div16);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    			if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let recentMeasurements;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Dashboard', slots, []);
    	let { measurements } = $$props;
    	let { totalConsumption } = $$props;
    	let { averageConsumption } = $$props;
    	let { lastMeasurement } = $$props;
    	let { setView } = $$props;
    	let { currentUser } = $$props;

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

    		if (setView === undefined && !('setView' in $$props || $$self.$$.bound[$$self.$$.props['setView']])) {
    			console.warn("<Dashboard> was created without expected prop 'setView'");
    		}

    		if (currentUser === undefined && !('currentUser' in $$props || $$self.$$.bound[$$self.$$.props['currentUser']])) {
    			console.warn("<Dashboard> was created without expected prop 'currentUser'");
    		}
    	});

    	const writable_props = [
    		'measurements',
    		'totalConsumption',
    		'averageConsumption',
    		'lastMeasurement',
    		'setView',
    		'currentUser'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Dashboard> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => setView('measurement');
    	const click_handler_1 = () => setView('history');
    	const click_handler_2 = () => setView('reports');

    	$$self.$$set = $$props => {
    		if ('measurements' in $$props) $$invalidate(0, measurements = $$props.measurements);
    		if ('totalConsumption' in $$props) $$invalidate(1, totalConsumption = $$props.totalConsumption);
    		if ('averageConsumption' in $$props) $$invalidate(2, averageConsumption = $$props.averageConsumption);
    		if ('lastMeasurement' in $$props) $$invalidate(3, lastMeasurement = $$props.lastMeasurement);
    		if ('setView' in $$props) $$invalidate(4, setView = $$props.setView);
    		if ('currentUser' in $$props) $$invalidate(5, currentUser = $$props.currentUser);
    	};

    	$$self.$capture_state = () => ({
    		measurements,
    		totalConsumption,
    		averageConsumption,
    		lastMeasurement,
    		setView,
    		currentUser,
    		recentMeasurements
    	});

    	$$self.$inject_state = $$props => {
    		if ('measurements' in $$props) $$invalidate(0, measurements = $$props.measurements);
    		if ('totalConsumption' in $$props) $$invalidate(1, totalConsumption = $$props.totalConsumption);
    		if ('averageConsumption' in $$props) $$invalidate(2, averageConsumption = $$props.averageConsumption);
    		if ('lastMeasurement' in $$props) $$invalidate(3, lastMeasurement = $$props.lastMeasurement);
    		if ('setView' in $$props) $$invalidate(4, setView = $$props.setView);
    		if ('currentUser' in $$props) $$invalidate(5, currentUser = $$props.currentUser);
    		if ('recentMeasurements' in $$props) $$invalidate(6, recentMeasurements = $$props.recentMeasurements);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*measurements*/ 1) {
    			$$invalidate(6, recentMeasurements = measurements.slice(-5).reverse());
    		}
    	};

    	return [
    		measurements,
    		totalConsumption,
    		averageConsumption,
    		lastMeasurement,
    		setView,
    		currentUser,
    		recentMeasurements,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class Dashboard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			measurements: 0,
    			totalConsumption: 1,
    			averageConsumption: 2,
    			lastMeasurement: 3,
    			setView: 4,
    			currentUser: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dashboard",
    			options,
    			id: create_fragment$7.name
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

    	get setView() {
    		throw new Error("<Dashboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set setView(value) {
    		throw new Error("<Dashboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get currentUser() {
    		throw new Error("<Dashboard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentUser(value) {
    		throw new Error("<Dashboard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/MeasurementForm.svelte generated by Svelte v3.59.2 */

    const file$6 = "src/components/MeasurementForm.svelte";

    function create_fragment$6(ctx) {
    	let div7;
    	let div5;
    	let h1;
    	let t1;
    	let form;
    	let div1;
    	let div0;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let div3;
    	let div2;
    	let label1;
    	let t6;
    	let input1;
    	let t7;
    	let div4;
    	let button0;
    	let t8;
    	let button0_disabled_value;
    	let t9;
    	let button1;
    	let t11;
    	let div6;
    	let h3;
    	let t13;
    	let ul;
    	let li0;
    	let t15;
    	let li1;
    	let t17;
    	let li2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div5 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Nova Medição de Água";
    			t1 = space();
    			form = element("form");
    			div1 = element("div");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Número do Hidrômetro *";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			div3 = element("div");
    			div2 = element("div");
    			label1 = element("label");
    			label1.textContent = "Consumo (L) *";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			div4 = element("div");
    			button0 = element("button");
    			t8 = text("💾 Salvar Medição");
    			t9 = space();
    			button1 = element("button");
    			button1.textContent = "🔄 Limpar";
    			t11 = space();
    			div6 = element("div");
    			h3 = element("h3");
    			h3.textContent = "💡 Dicas para Medição";
    			t13 = space();
    			ul = element("ul");
    			li0 = element("li");
    			li0.textContent = "✓ Certifique-se de que o hidrômetro está visível e legível";
    			t15 = space();
    			li1 = element("li");
    			li1.textContent = "✓ Anote o consumo com precisão";
    			t17 = space();
    			li2 = element("li");
    			li2.textContent = "✓ Registre observações importantes como vazamentos ou irregularidades";
    			attr_dev(h1, "class", "text-3xl font-bold mb-6 text-gray-800");
    			add_location(h1, file$6, 32, 2, 556);
    			attr_dev(label0, "class", "block text-sm font-medium text-gray-700 mb-1");
    			attr_dev(label0, "for", "meterNumber");
    			add_location(label0, file$6, 37, 5, 794);
    			attr_dev(input0, "id", "meterNumber");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			attr_dev(input0, "placeholder", "Ex: 123456789");
    			input0.required = true;
    			add_location(input0, file$6, 40, 5, 921);
    			attr_dev(div0, "class", "flex flex-col");
    			add_location(div0, file$6, 36, 4, 761);
    			attr_dev(div1, "class", "grid grid-cols-1 md:grid-cols-2 gap-4");
    			add_location(div1, file$6, 35, 3, 705);
    			attr_dev(label1, "class", "block text-sm font-medium text-gray-700 mb-1");
    			attr_dev(label1, "for", "consumption");
    			add_location(label1, file$6, 54, 5, 1276);
    			attr_dev(input1, "id", "consumption");
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "step", "0.1");
    			attr_dev(input1, "class", "p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			attr_dev(input1, "placeholder", "Ex: 123.4");
    			input1.required = true;
    			add_location(input1, file$6, 57, 5, 1394);
    			attr_dev(div2, "class", "flex flex-col");
    			add_location(div2, file$6, 53, 4, 1243);
    			attr_dev(div3, "class", "grid grid-cols-1 md:grid-cols-2 gap-4");
    			add_location(div3, file$6, 52, 3, 1187);
    			attr_dev(button0, "type", "submit");
    			attr_dev(button0, "class", "bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed");
    			button0.disabled = button0_disabled_value = !/*isValid*/ ctx[2];
    			add_location(button0, file$6, 70, 4, 1712);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "class", "bg-gray-200 text-gray-800 p-3 rounded-md hover:bg-gray-300 transition-colors font-semibold");
    			add_location(button1, file$6, 78, 4, 1968);
    			attr_dev(div4, "class", "flex space-x-4 mt-6");
    			add_location(div4, file$6, 69, 3, 1674);
    			attr_dev(form, "class", "space-y-6");
    			add_location(form, file$6, 34, 2, 637);
    			attr_dev(div5, "class", "bg-white p-6 rounded-lg shadow-md mb-8");
    			add_location(div5, file$6, 31, 1, 501);
    			attr_dev(h3, "class", "text-xl font-semibold mb-3 text-gray-700");
    			add_location(h3, file$6, 94, 2, 2318);
    			attr_dev(li0, "class", "flex items-center text-gray-700");
    			add_location(li0, file$6, 96, 3, 2444);
    			attr_dev(li1, "class", "flex items-center text-gray-700");
    			add_location(li1, file$6, 97, 3, 2555);
    			attr_dev(li2, "class", "flex items-center text-gray-700");
    			add_location(li2, file$6, 98, 3, 2638);
    			attr_dev(ul, "class", "list-none p-0 m-0 space-y-2");
    			add_location(ul, file$6, 95, 2, 2400);
    			attr_dev(div6, "class", "bg-white p-6 rounded-lg shadow-md");
    			add_location(div6, file$6, 93, 1, 2268);
    			attr_dev(div7, "class", "p-6");
    			add_location(div7, file$6, 30, 0, 482);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div5);
    			append_dev(div5, h1);
    			append_dev(div5, t1);
    			append_dev(div5, form);
    			append_dev(form, div1);
    			append_dev(div1, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			append_dev(div0, input0);
    			set_input_value(input0, /*meterNumber*/ ctx[0]);
    			append_dev(form, t4);
    			append_dev(form, div3);
    			append_dev(div3, div2);
    			append_dev(div2, label1);
    			append_dev(div2, t6);
    			append_dev(div2, input1);
    			set_input_value(input1, /*consumption*/ ctx[1]);
    			append_dev(form, t7);
    			append_dev(form, div4);
    			append_dev(div4, button0);
    			append_dev(button0, t8);
    			append_dev(div4, t9);
    			append_dev(div4, button1);
    			append_dev(div7, t11);
    			append_dev(div7, div6);
    			append_dev(div6, h3);
    			append_dev(div6, t13);
    			append_dev(div6, ul);
    			append_dev(ul, li0);
    			append_dev(ul, t15);
    			append_dev(ul, li1);
    			append_dev(ul, t17);
    			append_dev(ul, li2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[7]),
    					listen_dev(button1, "click", /*click_handler*/ ctx[8], false, false, false, false),
    					listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[3]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*meterNumber*/ 1 && input0.value !== /*meterNumber*/ ctx[0]) {
    				set_input_value(input0, /*meterNumber*/ ctx[0]);
    			}

    			if (dirty & /*consumption*/ 2 && to_number(input1.value) !== /*consumption*/ ctx[1]) {
    				set_input_value(input1, /*consumption*/ ctx[1]);
    			}

    			if (dirty & /*isValid*/ 4 && button0_disabled_value !== (button0_disabled_value = !/*isValid*/ ctx[2])) {
    				prop_dev(button0, "disabled", button0_disabled_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('MeasurementForm', slots, []);
    	let { addMeasurement } = $$props;
    	let { setView } = $$props;
    	let meterNumber = '';
    	let consumption = '';
    	let isValid = false;

    	function handleSubmit() {
    		if (!isValid) return;

    		const measurement = {
    			meterNumber: meterNumber.trim(),
    			consumption: parseFloat(consumption)
    		};

    		addMeasurement(measurement);

    		// Reset form
    		$$invalidate(0, meterNumber = '');

    		$$invalidate(1, consumption = '');
    		setView('dashboard');
    	}

    	$$self.$$.on_mount.push(function () {
    		if (addMeasurement === undefined && !('addMeasurement' in $$props || $$self.$$.bound[$$self.$$.props['addMeasurement']])) {
    			console.warn("<MeasurementForm> was created without expected prop 'addMeasurement'");
    		}

    		if (setView === undefined && !('setView' in $$props || $$self.$$.bound[$$self.$$.props['setView']])) {
    			console.warn("<MeasurementForm> was created without expected prop 'setView'");
    		}
    	});

    	const writable_props = ['addMeasurement', 'setView'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<MeasurementForm> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		meterNumber = this.value;
    		$$invalidate(0, meterNumber);
    	}

    	function input1_input_handler() {
    		consumption = to_number(this.value);
    		$$invalidate(1, consumption);
    	}

    	const click_handler = () => {
    		$$invalidate(0, meterNumber = '');
    		$$invalidate(1, consumption = '');
    	};

    	$$self.$$set = $$props => {
    		if ('addMeasurement' in $$props) $$invalidate(4, addMeasurement = $$props.addMeasurement);
    		if ('setView' in $$props) $$invalidate(5, setView = $$props.setView);
    	};

    	$$self.$capture_state = () => ({
    		addMeasurement,
    		setView,
    		meterNumber,
    		consumption,
    		isValid,
    		handleSubmit
    	});

    	$$self.$inject_state = $$props => {
    		if ('addMeasurement' in $$props) $$invalidate(4, addMeasurement = $$props.addMeasurement);
    		if ('setView' in $$props) $$invalidate(5, setView = $$props.setView);
    		if ('meterNumber' in $$props) $$invalidate(0, meterNumber = $$props.meterNumber);
    		if ('consumption' in $$props) $$invalidate(1, consumption = $$props.consumption);
    		if ('isValid' in $$props) $$invalidate(2, isValid = $$props.isValid);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*consumption, meterNumber*/ 3) {
    			{
    				$$invalidate(2, isValid = consumption && meterNumber.trim() !== '');
    			}
    		}
    	};

    	return [
    		meterNumber,
    		consumption,
    		isValid,
    		handleSubmit,
    		addMeasurement,
    		setView,
    		input0_input_handler,
    		input1_input_handler,
    		click_handler
    	];
    }

    class MeasurementForm extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { addMeasurement: 4, setView: 5 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MeasurementForm",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get addMeasurement() {
    		throw new Error("<MeasurementForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set addMeasurement(value) {
    		throw new Error("<MeasurementForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get setView() {
    		throw new Error("<MeasurementForm>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set setView(value) {
    		throw new Error("<MeasurementForm>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/History.svelte generated by Svelte v3.59.2 */

    const file$5 = "src/components/History.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[12] = list[i];
    	return child_ctx;
    }

    // (109:2) {:else}
    function create_else_block$2(ctx) {
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
    	let tbody;
    	let t8;
    	let div1;
    	let p;
    	let t9;
    	let t10_value = /*filteredMeasurements*/ ctx[4].length + "";
    	let t10;
    	let t11;
    	let t12_value = /*measurements*/ ctx[0].length + "";
    	let t12;
    	let t13;
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
    			th2.textContent = "Consumo (L)";
    			t5 = space();
    			th3 = element("th");
    			th3.textContent = "Ações";
    			t7 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t8 = space();
    			div1 = element("div");
    			p = element("p");
    			t9 = text("Mostrando ");
    			t10 = text(t10_value);
    			t11 = text(" de ");
    			t12 = text(t12_value);
    			t13 = text(" medições");
    			attr_dev(th0, "class", "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider");
    			add_location(th0, file$5, 113, 7, 3451);
    			attr_dev(th1, "class", "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider");
    			add_location(th1, file$5, 114, 7, 3559);
    			attr_dev(th2, "class", "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider");
    			add_location(th2, file$5, 115, 7, 3673);
    			attr_dev(th3, "class", "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider");
    			add_location(th3, file$5, 116, 7, 3788);
    			attr_dev(tr, "class", "bg-gray-200");
    			add_location(tr, file$5, 112, 6, 3419);
    			add_location(thead, file$5, 111, 5, 3405);
    			add_location(tbody, file$5, 119, 5, 3921);
    			attr_dev(table, "class", "min-w-full bg-white");
    			add_location(table, file$5, 110, 4, 3364);
    			attr_dev(div0, "class", "overflow-x-auto");
    			add_location(div0, file$5, 109, 3, 3330);
    			attr_dev(p, "class", "text-gray-600 text-sm");
    			add_location(p, file$5, 144, 4, 4868);
    			attr_dev(div1, "class", "text-center mt-6 pt-4 border-t border-gray-200 text-gray-600 text-sm");
    			add_location(div1, file$5, 143, 3, 4781);
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
    			append_dev(table, t7);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(tbody, null);
    				}
    			}

    			insert_dev(target, t8, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, p);
    			append_dev(p, t9);
    			append_dev(p, t10);
    			append_dev(p, t11);
    			append_dev(p, t12);
    			append_dev(p, t13);
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

    			if (dirty & /*filteredMeasurements*/ 16 && t10_value !== (t10_value = /*filteredMeasurements*/ ctx[4].length + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*measurements*/ 1 && t12_value !== (t12_value = /*measurements*/ ctx[0].length + "")) set_data_dev(t12, t12_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(109:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (103:46) 
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
    			attr_dev(div0, "class", "text-5xl mb-4");
    			add_location(div0, file$5, 104, 4, 3127);
    			attr_dev(h3, "class", "text-xl font-semibold mb-2");
    			add_location(h3, file$5, 105, 4, 3167);
    			attr_dev(p, "class", "text-gray-500");
    			add_location(p, file$5, 106, 4, 3243);
    			attr_dev(div1, "class", "text-center py-12 text-gray-600");
    			add_location(div1, file$5, 103, 3, 3077);
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
    		source: "(103:46) ",
    		ctx
    	});

    	return block;
    }

    // (97:2) {#if measurements.length === 0}
    function create_if_block$3(ctx) {
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
    			attr_dev(div0, "class", "text-5xl mb-4");
    			add_location(div0, file$5, 98, 4, 2824);
    			attr_dev(h3, "class", "text-xl font-semibold mb-2");
    			add_location(h3, file$5, 99, 4, 2864);
    			attr_dev(p, "class", "text-gray-500");
    			add_location(p, file$5, 100, 4, 2939);
    			attr_dev(div1, "class", "text-center py-12 text-gray-600");
    			add_location(div1, file$5, 97, 3, 2774);
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
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(97:2) {#if measurements.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (121:6) {#each filteredMeasurements as measurement}
    function create_each_block$1(ctx) {
    	let tr;
    	let td0;
    	let t0_value = new Date(/*measurement*/ ctx[12].date).toLocaleDateString('pt-BR') + "";
    	let t0;
    	let t1;
    	let td1;
    	let t2_value = /*measurement*/ ctx[12].meterNumber + "";
    	let t2;
    	let t3;
    	let td2;
    	let strong;
    	let t4_value = /*measurement*/ ctx[12].consumption.toFixed(1) + "";
    	let t4;
    	let t5;
    	let td3;
    	let button;
    	let t7;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[11](/*measurement*/ ctx[12]);
    	}

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
    			button = element("button");
    			button.textContent = "🗑️";
    			t7 = space();
    			attr_dev(td0, "class", "px-4 py-3 whitespace-nowrap text-sm text-gray-800");
    			add_location(td0, file$5, 122, 8, 3999);
    			attr_dev(td1, "class", "px-4 py-3 whitespace-nowrap text-sm text-gray-800");
    			add_location(td1, file$5, 125, 8, 4150);
    			add_location(strong, file$5, 127, 9, 4335);
    			attr_dev(td2, "class", "px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-center");
    			add_location(td2, file$5, 126, 8, 4251);
    			attr_dev(button, "class", "bg-red-500 text-white px-2 py-1 rounded-md hover:bg-red-600 transition-colors text-xs");
    			add_location(button, file$5, 130, 9, 4483);
    			attr_dev(td3, "class", "px-4 py-3 whitespace-nowrap text-sm text-gray-800");
    			add_location(td3, file$5, 129, 8, 4411);
    			add_location(tr, file$5, 121, 7, 3986);
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
    			append_dev(td3, button);
    			append_dev(tr, t7);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*filteredMeasurements*/ 16 && t0_value !== (t0_value = new Date(/*measurement*/ ctx[12].date).toLocaleDateString('pt-BR') + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*filteredMeasurements*/ 16 && t2_value !== (t2_value = /*measurement*/ ctx[12].meterNumber + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*filteredMeasurements*/ 16 && t4_value !== (t4_value = /*measurement*/ ctx[12].consumption.toFixed(1) + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(121:6) {#each filteredMeasurements as measurement}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
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
    		if (/*measurements*/ ctx[0].length === 0) return create_if_block$3;
    		if (/*filteredMeasurements*/ ctx[4].length === 0) return create_if_block_1$2;
    		return create_else_block$2;
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
    			attr_dev(h1, "class", "text-3xl font-bold mb-4 text-gray-800");
    			add_location(h1, file$5, 65, 3, 1526);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			attr_dev(input, "placeholder", "Buscar por hidrômetro, localização ou observações...");
    			add_location(input, file$5, 69, 5, 1696);
    			attr_dev(div0, "class", "flex-grow");
    			add_location(div0, file$5, 68, 4, 1667);
    			option0.__value = "date";
    			option0.value = option0.__value;
    			add_location(option0, file$5, 79, 6, 2126);
    			option1.__value = "consumption";
    			option1.value = option1.__value;
    			add_location(option1, file$5, 80, 6, 2167);
    			option2.__value = "meterNumber";
    			option2.value = option2.__value;
    			add_location(option2, file$5, 81, 6, 2218);
    			attr_dev(select0, "class", "p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			if (/*sortBy*/ ctx[2] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[9].call(select0));
    			add_location(select0, file$5, 78, 5, 1993);
    			option3.__value = "desc";
    			option3.value = option3.__value;
    			add_location(option3, file$5, 85, 6, 2428);
    			option4.__value = "asc";
    			option4.value = option4.__value;
    			add_location(option4, file$5, 86, 6, 2476);
    			attr_dev(select1, "class", "p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			if (/*sortOrder*/ ctx[3] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[10].call(select1));
    			add_location(select1, file$5, 84, 5, 2292);
    			attr_dev(div1, "class", "flex gap-2");
    			add_location(div1, file$5, 77, 4, 1963);
    			attr_dev(button, "class", "bg-gray-200 text-gray-800 p-3 rounded-md hover:bg-gray-300 transition-colors font-semibold");
    			add_location(button, file$5, 90, 4, 2550);
    			attr_dev(div2, "class", "flex flex-wrap items-center gap-4 mb-6");
    			add_location(div2, file$5, 67, 3, 1610);
    			attr_dev(div3, "class", "mb-6");
    			add_location(div3, file$5, 64, 2, 1504);
    			attr_dev(div4, "class", "bg-white p-6 rounded-lg shadow-md mb-8");
    			add_location(div4, file$5, 63, 1, 1449);
    			attr_dev(div5, "class", "p-6");
    			add_location(div5, file$5, 62, 0, 1430);
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
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
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
    				return measurement.meterNumber.toLowerCase().includes(term);
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
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { measurements: 0, deleteMeasurement: 7 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "History",
    			options,
    			id: create_fragment$5.name
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

    /* src/components/Comparison.svelte generated by Svelte v3.59.2 */

    const file$4 = "src/components/Comparison.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let p0;
    	let t2;
    	let t3_value = /*currentUserConsumption*/ ctx[0].toFixed(1) + "";
    	let t3;
    	let t4;
    	let t5;
    	let p1;
    	let t6;
    	let t7_value = /*averageConsumption*/ ctx[1].toFixed(1) + "";
    	let t7;
    	let t8;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Comparação de Consumo";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("Seu consumo: ");
    			t3 = text(t3_value);
    			t4 = text(" L");
    			t5 = space();
    			p1 = element("p");
    			t6 = text("Média de consumo de outros usuários com os mesmos eletrodomésticos: ");
    			t7 = text(t7_value);
    			t8 = text(" L");
    			attr_dev(h2, "class", "text-2xl font-semibold mb-4 text-gray-700");
    			add_location(h2, file$4, 6, 2, 140);
    			add_location(p0, file$4, 7, 2, 223);
    			add_location(p1, file$4, 8, 2, 283);
    			attr_dev(div, "class", "bg-white p-6 rounded-lg shadow-md");
    			add_location(div, file$4, 5, 0, 90);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t1);
    			append_dev(div, p0);
    			append_dev(p0, t2);
    			append_dev(p0, t3);
    			append_dev(p0, t4);
    			append_dev(div, t5);
    			append_dev(div, p1);
    			append_dev(p1, t6);
    			append_dev(p1, t7);
    			append_dev(p1, t8);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentUserConsumption*/ 1 && t3_value !== (t3_value = /*currentUserConsumption*/ ctx[0].toFixed(1) + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*averageConsumption*/ 2 && t7_value !== (t7_value = /*averageConsumption*/ ctx[1].toFixed(1) + "")) set_data_dev(t7, t7_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Comparison', slots, []);
    	let { currentUserConsumption } = $$props;
    	let { averageConsumption } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (currentUserConsumption === undefined && !('currentUserConsumption' in $$props || $$self.$$.bound[$$self.$$.props['currentUserConsumption']])) {
    			console.warn("<Comparison> was created without expected prop 'currentUserConsumption'");
    		}

    		if (averageConsumption === undefined && !('averageConsumption' in $$props || $$self.$$.bound[$$self.$$.props['averageConsumption']])) {
    			console.warn("<Comparison> was created without expected prop 'averageConsumption'");
    		}
    	});

    	const writable_props = ['currentUserConsumption', 'averageConsumption'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Comparison> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('currentUserConsumption' in $$props) $$invalidate(0, currentUserConsumption = $$props.currentUserConsumption);
    		if ('averageConsumption' in $$props) $$invalidate(1, averageConsumption = $$props.averageConsumption);
    	};

    	$$self.$capture_state = () => ({
    		currentUserConsumption,
    		averageConsumption
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentUserConsumption' in $$props) $$invalidate(0, currentUserConsumption = $$props.currentUserConsumption);
    		if ('averageConsumption' in $$props) $$invalidate(1, averageConsumption = $$props.averageConsumption);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [currentUserConsumption, averageConsumption];
    }

    class Comparison extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			currentUserConsumption: 0,
    			averageConsumption: 1
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Comparison",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get currentUserConsumption() {
    		throw new Error("<Comparison>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentUserConsumption(value) {
    		throw new Error("<Comparison>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get averageConsumption() {
    		throw new Error("<Comparison>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set averageConsumption(value) {
    		throw new Error("<Comparison>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Reports.svelte generated by Svelte v3.59.2 */

    const { Object: Object_1, console: console_1$1 } = globals;
    const file$3 = "src/components/Reports.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[16] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[21] = i;
    	return child_ctx;
    }

    // (203:2) {:else}
    function create_else_block$1(ctx) {
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
    	let t18;
    	let div15;
    	let h21;
    	let t20;
    	let div14;
    	let button;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*trend*/ ctx[7] === 'increasing') return create_if_block_9;
    		if (/*trend*/ ctx[7] === 'decreasing') return create_if_block_10;
    		return create_else_block_4;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block0 = current_block_type(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*selectedPeriod*/ ctx[3] === 'monthly') return create_if_block_7;
    		if (/*selectedPeriod*/ ctx[3] === 'weekly') return create_if_block_8;
    		return create_else_block_3;
    	}

    	let current_block_type_1 = select_block_type_2(ctx);
    	let if_block1 = current_block_type_1(ctx);

    	function select_block_type_3(ctx, dirty) {
    		if (/*chartData*/ ctx[4].length > 0) return create_if_block_3$1;
    		return create_else_block_2;
    	}

    	let current_block_type_2 = select_block_type_3(ctx);
    	let if_block2 = current_block_type_2(ctx);
    	let if_block3 = /*topConsumers*/ ctx[6].length > 0 && create_if_block_2$1(ctx);
    	let if_block4 = /*comparisonData*/ ctx[5] && create_if_block_1$1(ctx);

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
    			if (if_block4) if_block4.c();
    			t18 = space();
    			div15 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Exportar Relatório";
    			t20 = space();
    			div14 = element("div");
    			button = element("button");
    			button.textContent = "📊 Exportar Relatório Completo";
    			attr_dev(div0, "class", "text-4xl font-bold text-blue-600 mb-1");
    			add_location(div0, file$3, 206, 5, 5805);
    			attr_dev(div1, "class", "text-sm text-gray-500 uppercase");
    			add_location(div1, file$3, 207, 5, 5889);
    			attr_dev(div2, "class", "bg-white p-5 rounded-lg shadow-md text-center");
    			add_location(div2, file$3, 205, 4, 5740);
    			attr_dev(div3, "class", "text-4xl font-bold text-blue-600 mb-1");
    			add_location(div3, file$3, 211, 5, 6043);
    			attr_dev(div4, "class", "text-sm text-gray-500 uppercase");
    			add_location(div4, file$3, 212, 5, 6135);
    			attr_dev(div5, "class", "bg-white p-5 rounded-lg shadow-md text-center");
    			add_location(div5, file$3, 210, 4, 5978);
    			attr_dev(div6, "class", "text-4xl font-bold text-blue-600 mb-1");
    			add_location(div6, file$3, 216, 5, 6289);
    			attr_dev(div7, "class", "text-sm text-gray-500 uppercase");
    			add_location(div7, file$3, 217, 5, 6383);
    			attr_dev(div8, "class", "bg-white p-5 rounded-lg shadow-md text-center");
    			add_location(div8, file$3, 215, 4, 6224);
    			attr_dev(div9, "class", "text-4xl font-bold mb-1 flex items-center justify-center gap-2");
    			toggle_class(div9, "text-red-500", /*trend*/ ctx[7] === 'increasing');
    			toggle_class(div9, "text-green-500", /*trend*/ ctx[7] === 'decreasing');
    			toggle_class(div9, "text-gray-600", /*trend*/ ctx[7] === 'stable');
    			add_location(div9, file$3, 221, 5, 6529);
    			attr_dev(div10, "class", "text-sm text-gray-500 uppercase");
    			add_location(div10, file$3, 230, 5, 6914);
    			attr_dev(div11, "class", "bg-white p-5 rounded-lg shadow-md text-center");
    			add_location(div11, file$3, 220, 4, 6464);
    			attr_dev(div12, "class", "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8");
    			add_location(div12, file$3, 204, 3, 5664);
    			attr_dev(h20, "class", "text-2xl font-semibold mb-4 text-gray-700");
    			add_location(h20, file$3, 236, 4, 7080);
    			attr_dev(div13, "class", "bg-white p-6 rounded-lg shadow-md mb-8");
    			add_location(div13, file$3, 235, 3, 7023);
    			attr_dev(h21, "class", "text-2xl font-semibold mb-4 text-gray-700");
    			add_location(h21, file$3, 317, 4, 10250);
    			attr_dev(button, "class", "bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors font-semibold");
    			add_location(button, file$3, 319, 5, 10372);
    			attr_dev(div14, "class", "flex gap-4 flex-wrap");
    			add_location(div14, file$3, 318, 4, 10332);
    			attr_dev(div15, "class", "bg-white p-6 rounded-lg shadow-md");
    			add_location(div15, file$3, 316, 3, 10198);
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
    			if (if_block4) if_block4.m(target, anchor);
    			insert_dev(target, t18, anchor);
    			insert_dev(target, div15, anchor);
    			append_dev(div15, h21);
    			append_dev(div15, t20);
    			append_dev(div15, div14);
    			append_dev(div14, button);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*exportReport*/ ctx[8], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*measurements*/ 1) && t0_value !== (t0_value = /*measurements*/ ctx[0].length + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*totalConsumption*/ 2) && t4_value !== (t4_value = /*totalConsumption*/ ctx[1].toFixed(1) + "")) set_data_dev(t4, t4_value);
    			if ((!current || dirty & /*averageConsumption*/ 4) && t8_value !== (t8_value = /*averageConsumption*/ ctx[2].toFixed(1) + "")) set_data_dev(t8, t8_value);

    			if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div9, null);
    				}
    			}

    			if (!current || dirty & /*trend*/ 128) {
    				toggle_class(div9, "text-red-500", /*trend*/ ctx[7] === 'increasing');
    			}

    			if (!current || dirty & /*trend*/ 128) {
    				toggle_class(div9, "text-green-500", /*trend*/ ctx[7] === 'decreasing');
    			}

    			if (!current || dirty & /*trend*/ 128) {
    				toggle_class(div9, "text-gray-600", /*trend*/ ctx[7] === 'stable');
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

    			if (/*topConsumers*/ ctx[6].length > 0) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_2$1(ctx);
    					if_block3.c();
    					if_block3.m(t17.parentNode, t17);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*comparisonData*/ ctx[5]) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);

    					if (dirty & /*comparisonData*/ 32) {
    						transition_in(if_block4, 1);
    					}
    				} else {
    					if_block4 = create_if_block_1$1(ctx);
    					if_block4.c();
    					transition_in(if_block4, 1);
    					if_block4.m(t18.parentNode, t18);
    				}
    			} else if (if_block4) {
    				group_outros();

    				transition_out(if_block4, 1, 1, () => {
    					if_block4 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block4);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block4);
    			current = false;
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
    			if (if_block4) if_block4.d(detaching);
    			if (detaching) detach_dev(t18);
    			if (detaching) detach_dev(div15);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(203:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (197:2) {#if measurements.length === 0}
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
    			h3.textContent = "Nenhum dado disponível";
    			t3 = space();
    			p = element("p");
    			p.textContent = "Registre algumas medições para gerar relatórios.";
    			attr_dev(div0, "class", "text-5xl mb-4");
    			add_location(div0, file$3, 198, 4, 5426);
    			attr_dev(h3, "class", "text-xl font-semibold mb-2");
    			add_location(h3, file$3, 199, 4, 5466);
    			attr_dev(p, "class", "text-gray-500");
    			add_location(p, file$3, 200, 4, 5537);
    			attr_dev(div1, "class", "text-center py-12 text-gray-600");
    			add_location(div1, file$3, 197, 3, 5376);
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
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(197:2) {#if measurements.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (227:6) {:else}
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
    		source: "(227:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (225:39) 
    function create_if_block_10(ctx) {
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
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(225:39) ",
    		ctx
    	});

    	return block;
    }

    // (223:6) {#if trend === 'increasing'}
    function create_if_block_9(ctx) {
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
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(223:6) {#if trend === 'increasing'}",
    		ctx
    	});

    	return block;
    }

    // (242:5) {:else}
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
    		source: "(242:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (240:43) 
    function create_if_block_8(ctx) {
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
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(240:43) ",
    		ctx
    	});

    	return block;
    }

    // (238:5) {#if selectedPeriod === 'monthly'}
    function create_if_block_7(ctx) {
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
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(238:5) {#if selectedPeriod === 'monthly'}",
    		ctx
    	});

    	return block;
    }

    // (275:4) {:else}
    function create_else_block_2(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Nenhum dado disponível para o período selecionado.";
    			attr_dev(p, "class", "text-center text-gray-500 py-8");
    			add_location(p, file$3, 275, 5, 8360);
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
    		source: "(275:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (247:4) {#if chartData.length > 0}
    function create_if_block_3$1(ctx) {
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

    			attr_dev(div, "class", "flex flex-col gap-4");
    			add_location(div, file$3, 247, 5, 7360);
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
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(247:4) {#if chartData.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (256:9) {:else}
    function create_else_block_1(ctx) {
    	let t_value = new Date(/*item*/ ctx[19].date).toLocaleDateString('pt-BR') + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*chartData*/ 16 && t_value !== (t_value = new Date(/*item*/ ctx[19].date).toLocaleDateString('pt-BR') + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(256:9) {:else}",
    		ctx
    	});

    	return block;
    }

    // (254:47) 
    function create_if_block_6(ctx) {
    	let t_value = new Date(/*item*/ ctx[19].week).toLocaleDateString('pt-BR') + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*chartData*/ 16 && t_value !== (t_value = new Date(/*item*/ ctx[19].week).toLocaleDateString('pt-BR') + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(254:47) ",
    		ctx
    	});

    	return block;
    }

    // (252:9) {#if selectedPeriod === 'monthly'}
    function create_if_block_5$1(ctx) {
    	let t_value = /*item*/ ctx[19].month + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*chartData*/ 16 && t_value !== (t_value = /*item*/ ctx[19].month + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5$1.name,
    		type: "if",
    		source: "(252:9) {#if selectedPeriod === 'monthly'}",
    		ctx
    	});

    	return block;
    }

    // (267:10) {#if item.count > 1}
    function create_if_block_4$1(ctx) {
    	let small;
    	let t0;
    	let t1_value = /*item*/ ctx[19].count + "";
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			small = element("small");
    			t0 = text("(");
    			t1 = text(t1_value);
    			t2 = text(" medições)");
    			add_location(small, file$3, 267, 11, 8216);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, small, anchor);
    			append_dev(small, t0);
    			append_dev(small, t1);
    			append_dev(small, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*chartData*/ 16 && t1_value !== (t1_value = /*item*/ ctx[19].count + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(small);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(267:10) {#if item.count > 1}",
    		ctx
    	});

    	return block;
    }

    // (249:6) {#each chartData as item, index}
    function create_each_block_1(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div2;
    	let div1;
    	let t1;
    	let span;
    	let t2_value = /*item*/ ctx[19].consumption.toFixed(1) + "";
    	let t2;
    	let t3;
    	let t4;

    	function select_block_type_4(ctx, dirty) {
    		if (/*selectedPeriod*/ ctx[3] === 'monthly') return create_if_block_5$1;
    		if (/*selectedPeriod*/ ctx[3] === 'weekly') return create_if_block_6;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_4(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*item*/ ctx[19].count > 1 && create_if_block_4$1(ctx);

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
    			attr_dev(div0, "class", "min-w-[120px] text-sm text-gray-600");
    			add_location(div0, file$3, 250, 8, 7486);
    			attr_dev(div1, "class", "h-5 bg-blue-500 rounded-full");
    			set_style(div1, "width", Math.max(5, /*item*/ ctx[19].consumption / Math.max(.../*chartData*/ ctx[4].map(func)) * 100) + "%");
    			add_location(div1, file$3, 260, 9, 7880);
    			attr_dev(span, "class", "min-w-[100px] font-semibold text-gray-800");
    			add_location(span, file$3, 264, 9, 8075);
    			attr_dev(div2, "class", "flex-1 flex items-center gap-4");
    			add_location(div2, file$3, 259, 8, 7826);
    			attr_dev(div3, "class", "flex items-center gap-4");
    			add_location(div3, file$3, 249, 7, 7440);
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
    				set_style(div1, "width", Math.max(5, /*item*/ ctx[19].consumption / Math.max(.../*chartData*/ ctx[4].map(func)) * 100) + "%");
    			}

    			if (dirty & /*chartData*/ 16 && t2_value !== (t2_value = /*item*/ ctx[19].consumption.toFixed(1) + "")) set_data_dev(t2, t2_value);

    			if (/*item*/ ctx[19].count > 1) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_4$1(ctx);
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
    		source: "(249:6) {#each chartData as item, index}",
    		ctx
    	});

    	return block;
    }

    // (281:3) {#if topConsumers.length > 0}
    function create_if_block_2$1(ctx) {
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
    	let tbody;
    	let each_value = /*topConsumers*/ ctx[6];
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
    			th1.textContent = "Consumo Total (L)";
    			t5 = space();
    			th2 = element("th");
    			th2.textContent = "Medições";
    			t7 = space();
    			th3 = element("th");
    			th3.textContent = "Média (L)";
    			t9 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h2, "class", "text-2xl font-semibold mb-4 text-gray-700");
    			add_location(h2, file$3, 282, 5, 8599);
    			attr_dev(th0, "class", "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider");
    			add_location(th0, file$3, 287, 9, 8813);
    			attr_dev(th1, "class", "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider");
    			add_location(th1, file$3, 288, 9, 8929);
    			attr_dev(th2, "class", "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider");
    			add_location(th2, file$3, 289, 9, 9052);
    			attr_dev(th3, "class", "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider");
    			add_location(th3, file$3, 290, 9, 9166);
    			attr_dev(tr, "class", "bg-gray-200");
    			add_location(tr, file$3, 286, 8, 8779);
    			add_location(thead, file$3, 285, 7, 8763);
    			add_location(tbody, file$3, 293, 7, 9309);
    			attr_dev(table, "class", "min-w-full bg-white");
    			add_location(table, file$3, 284, 6, 8720);
    			attr_dev(div0, "class", "overflow-x-auto");
    			add_location(div0, file$3, 283, 5, 8684);
    			attr_dev(div1, "class", "bg-white p-6 rounded-lg shadow-md mb-8");
    			add_location(div1, file$3, 281, 4, 8541);
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
    			append_dev(table, t9);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(tbody, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*topConsumers*/ 64) {
    				each_value = /*topConsumers*/ ctx[6];
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
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(281:3) {#if topConsumers.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (295:8) {#each topConsumers as consumer}
    function create_each_block(ctx) {
    	let tr;
    	let td0;
    	let t0_value = /*consumer*/ ctx[16].meterNumber + "";
    	let t0;
    	let t1;
    	let td1;
    	let strong;
    	let t2_value = /*consumer*/ ctx[16].totalConsumption.toFixed(1) + "";
    	let t2;
    	let t3;
    	let td2;
    	let t4_value = /*consumer*/ ctx[16].count + "";
    	let t4;
    	let t5;
    	let td3;
    	let t6_value = (/*consumer*/ ctx[16].totalConsumption / /*consumer*/ ctx[16].count).toFixed(1) + "";
    	let t6;
    	let t7;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			td1 = element("td");
    			strong = element("strong");
    			t2 = text(t2_value);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			t6 = text(t6_value);
    			t7 = space();
    			attr_dev(td0, "class", "px-4 py-3 whitespace-nowrap text-sm text-gray-800");
    			add_location(td0, file$3, 296, 10, 9382);
    			add_location(strong, file$3, 297, 72, 9544);
    			attr_dev(td1, "class", "px-4 py-3 whitespace-nowrap text-sm text-gray-800");
    			add_location(td1, file$3, 297, 10, 9482);
    			attr_dev(td2, "class", "px-4 py-3 whitespace-nowrap text-sm text-gray-800");
    			add_location(td2, file$3, 298, 10, 9615);
    			attr_dev(td3, "class", "px-4 py-3 whitespace-nowrap text-sm text-gray-800");
    			add_location(td3, file$3, 299, 10, 9709);
    			add_location(tr, file$3, 295, 9, 9367);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, strong);
    			append_dev(strong, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			append_dev(td3, t6);
    			append_dev(tr, t7);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*topConsumers*/ 64 && t0_value !== (t0_value = /*consumer*/ ctx[16].meterNumber + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*topConsumers*/ 64 && t2_value !== (t2_value = /*consumer*/ ctx[16].totalConsumption.toFixed(1) + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*topConsumers*/ 64 && t4_value !== (t4_value = /*consumer*/ ctx[16].count + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*topConsumers*/ 64 && t6_value !== (t6_value = (/*consumer*/ ctx[16].totalConsumption / /*consumer*/ ctx[16].count).toFixed(1) + "")) set_data_dev(t6, t6_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(295:8) {#each topConsumers as consumer}",
    		ctx
    	});

    	return block;
    }

    // (310:3) {#if comparisonData}
    function create_if_block_1$1(ctx) {
    	let div;
    	let comparison;
    	let current;

    	comparison = new Comparison({
    			props: {
    				currentUserConsumption: /*averageConsumption*/ ctx[2],
    				averageConsumption: /*comparisonData*/ ctx[5].averageConsumption
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(comparison.$$.fragment);
    			attr_dev(div, "class", "bg-white p-6 rounded-lg shadow-md");
    			add_location(div, file$3, 310, 4, 9980);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(comparison, div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const comparison_changes = {};
    			if (dirty & /*averageConsumption*/ 4) comparison_changes.currentUserConsumption = /*averageConsumption*/ ctx[2];
    			if (dirty & /*comparisonData*/ 32) comparison_changes.averageConsumption = /*comparisonData*/ ctx[5].averageConsumption;
    			comparison.$set(comparison_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(comparison.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(comparison.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(comparison);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(310:3) {#if comparisonData}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
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
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block$2, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*measurements*/ ctx[0].length === 0) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

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
    			attr_dev(h1, "class", "text-3xl font-bold text-gray-800");
    			add_location(h1, file$3, 184, 3, 4814);
    			attr_dev(label, "class", "block text-sm font-medium text-gray-700");
    			add_location(label, file$3, 187, 4, 4935);
    			option0.__value = "all";
    			option0.value = option0.__value;
    			add_location(option0, file$3, 189, 5, 5162);
    			option1.__value = "weekly";
    			option1.value = option1.__value;
    			add_location(option1, file$3, 190, 5, 5216);
    			option2.__value = "monthly";
    			option2.value = option2.__value;
    			add_location(option2, file$3, 191, 5, 5264);
    			attr_dev(select, "class", "p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			if (/*selectedPeriod*/ ctx[3] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[9].call(select));
    			add_location(select, file$3, 188, 4, 5022);
    			attr_dev(div0, "class", "flex items-center gap-2");
    			add_location(div0, file$3, 186, 3, 4893);
    			attr_dev(div1, "class", "flex justify-between items-center flex-wrap gap-4 mb-6");
    			add_location(div1, file$3, 183, 2, 4742);
    			attr_dev(div2, "class", "bg-white p-6 rounded-lg shadow-md mb-8");
    			add_location(div2, file$3, 182, 1, 4687);
    			attr_dev(div3, "class", "p-6");
    			add_location(div3, file$3, 181, 0, 4668);
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
    			if_blocks[current_block_type_index].m(div2, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(select, "change", /*select_change_handler*/ ctx[9]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*selectedPeriod*/ 8) {
    				select_option(select, /*selectedPeriod*/ ctx[3]);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div2, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			if_blocks[current_block_type_index].d();
    			mounted = false;
    			dispose();
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

    const func = d => d.consumption;

    function instance$3($$self, $$props, $$invalidate) {
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
    	let comparisonData = null;

    	onMount(async () => {
    		await getComparisonData();
    	});

    	async function getComparisonData() {
    		const token = localStorage.getItem('token');
    		if (!token) return;

    		try {
    			const response = await fetch('http://localhost:8081/api/comparison', { headers: { 'Authorization': token } });

    			if (response.ok) {
    				$$invalidate(5, comparisonData = await response.json());
    			}
    		} catch(error) {
    			console.error('Error fetching comparison data:', error);
    		}
    	}

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
    			console_1$1.warn("<Reports> was created without expected prop 'measurements'");
    		}

    		if (totalConsumption === undefined && !('totalConsumption' in $$props || $$self.$$.bound[$$self.$$.props['totalConsumption']])) {
    			console_1$1.warn("<Reports> was created without expected prop 'totalConsumption'");
    		}

    		if (averageConsumption === undefined && !('averageConsumption' in $$props || $$self.$$.bound[$$self.$$.props['averageConsumption']])) {
    			console_1$1.warn("<Reports> was created without expected prop 'averageConsumption'");
    		}
    	});

    	const writable_props = ['measurements', 'totalConsumption', 'averageConsumption'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Reports> was created with unknown prop '${key}'`);
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
    		Comparison,
    		auth,
    		measurements,
    		totalConsumption,
    		averageConsumption,
    		selectedPeriod,
    		chartData,
    		monthlyData,
    		weeklyData,
    		comparisonData,
    		getComparisonData,
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
    		if ('comparisonData' in $$props) $$invalidate(5, comparisonData = $$props.comparisonData);
    		if ('topConsumers' in $$props) $$invalidate(6, topConsumers = $$props.topConsumers);
    		if ('trend' in $$props) $$invalidate(7, trend = $$props.trend);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	{
    		updateChartData();
    	}

    	$$invalidate(7, trend = getConsumptionTrend());
    	$$invalidate(6, topConsumers = getTopConsumers());

    	return [
    		measurements,
    		totalConsumption,
    		averageConsumption,
    		selectedPeriod,
    		chartData,
    		comparisonData,
    		topConsumers,
    		trend,
    		exportReport,
    		select_change_handler
    	];
    }

    class Reports extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			measurements: 0,
    			totalConsumption: 1,
    			averageConsumption: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Reports",
    			options,
    			id: create_fragment$3.name
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

    /* src/components/Login.svelte generated by Svelte v3.59.2 */
    const file$2 = "src/components/Login.svelte";

    // (36:8) {#if error}
    function create_if_block$1(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*error*/ ctx[2]);
    			attr_dev(p, "class", "text-red-500 text-center");
    			add_location(p, file$2, 36, 12, 1499);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*error*/ 4) set_data_dev(t, /*error*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(36:8) {#if error}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div;
    	let h2;
    	let t1;
    	let form;
    	let input0;
    	let t2;
    	let input1;
    	let t3;
    	let button;
    	let t5;
    	let mounted;
    	let dispose;
    	let if_block = /*error*/ ctx[2] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Login";
    			t1 = space();
    			form = element("form");
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			button = element("button");
    			button.textContent = "Login";
    			t5 = space();
    			if (if_block) if_block.c();
    			attr_dev(h2, "class", "text-3xl font-bold text-center mb-6 text-gray-800");
    			add_location(h2, file$2, 30, 4, 814);
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "placeholder", "Email");
    			input0.required = true;
    			attr_dev(input0, "class", "p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			add_location(input0, file$2, 32, 8, 971);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "placeholder", "Password");
    			input1.required = true;
    			attr_dev(input1, "class", "p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			add_location(input1, file$2, 33, 8, 1148);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors font-semibold");
    			add_location(button, file$2, 34, 8, 1334);
    			attr_dev(form, "class", "flex flex-col space-y-4");
    			add_location(form, file$2, 31, 4, 891);
    			attr_dev(div, "class", "max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-md");
    			add_location(div, file$2, 29, 0, 739);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t1);
    			append_dev(div, form);
    			append_dev(form, input0);
    			set_input_value(input0, /*email*/ ctx[0]);
    			append_dev(form, t2);
    			append_dev(form, input1);
    			set_input_value(input1, /*password*/ ctx[1]);
    			append_dev(form, t3);
    			append_dev(form, button);
    			append_dev(form, t5);
    			if (if_block) if_block.m(form, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    					listen_dev(form, "submit", prevent_default(/*login*/ ctx[3]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*email*/ 1 && input0.value !== /*email*/ ctx[0]) {
    				set_input_value(input0, /*email*/ ctx[0]);
    			}

    			if (dirty & /*password*/ 2 && input1.value !== /*password*/ ctx[1]) {
    				set_input_value(input1, /*password*/ ctx[1]);
    			}

    			if (/*error*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(form, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Login', slots, []);
    	let email = '';
    	let password = '';
    	let error = '';

    	async function login() {
    		try {
    			const response = await fetch('http://localhost:8080/api/login', {
    				method: 'POST',
    				headers: { 'Content-Type': 'application/json' },
    				body: JSON.stringify({ email, password })
    			});

    			if (response.ok) {
    				const data = await response.json();
    				auth.login(data.token);
    			} else {
    				$$invalidate(2, error = 'Invalid credentials');
    			}
    		} catch(e) {
    			$$invalidate(2, error = 'An error occurred');
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		email = this.value;
    		$$invalidate(0, email);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(1, password);
    	}

    	$$self.$capture_state = () => ({ auth, email, password, error, login });

    	$$self.$inject_state = $$props => {
    		if ('email' in $$props) $$invalidate(0, email = $$props.email);
    		if ('password' in $$props) $$invalidate(1, password = $$props.password);
    		if ('error' in $$props) $$invalidate(2, error = $$props.error);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [email, password, error, login, input0_input_handler, input1_input_handler];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/SignUp.svelte generated by Svelte v3.59.2 */

    const file$1 = "src/components/SignUp.svelte";

    function create_fragment$1(ctx) {
    	let div1;
    	let h2;
    	let t1;
    	let div0;
    	let form;
    	let input0;
    	let t2;
    	let input1;
    	let t3;
    	let input2;
    	let t4;
    	let input3;
    	let t5;
    	let input4;
    	let t6;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Sign Up";
    			t1 = space();
    			div0 = element("div");
    			form = element("form");
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			input2 = element("input");
    			t4 = space();
    			input3 = element("input");
    			t5 = space();
    			input4 = element("input");
    			t6 = space();
    			button = element("button");
    			button.textContent = "Sign Up";
    			attr_dev(h2, "class", "text-3xl font-bold text-center mb-6 text-gray-800");
    			add_location(h2, file$1, 24, 4, 469);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Username");
    			input0.required = true;
    			attr_dev(input0, "class", "p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			add_location(input0, file$1, 28, 12, 654);
    			attr_dev(input1, "type", "email");
    			attr_dev(input1, "placeholder", "Email");
    			input1.required = true;
    			attr_dev(input1, "class", "p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			add_location(input1, file$1, 29, 12, 848);
    			attr_dev(input2, "type", "password");
    			attr_dev(input2, "placeholder", "Password");
    			input2.required = true;
    			attr_dev(input2, "class", "p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			add_location(input2, file$1, 30, 12, 1037);
    			attr_dev(input3, "type", "text");
    			attr_dev(input3, "placeholder", "Street");
    			input3.required = true;
    			attr_dev(input3, "class", "p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			add_location(input3, file$1, 31, 12, 1235);
    			attr_dev(input4, "type", "text");
    			attr_dev(input4, "placeholder", "District");
    			input4.required = true;
    			attr_dev(input4, "class", "p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500");
    			add_location(input4, file$1, 32, 12, 1425);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 transition-colors font-semibold");
    			add_location(button, file$1, 33, 12, 1619);
    			attr_dev(form, "class", "flex flex-col space-y-4");
    			add_location(form, file$1, 27, 8, 563);
    			add_location(div0, file$1, 26, 4, 549);
    			attr_dev(div1, "class", "max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-md");
    			add_location(div1, file$1, 23, 0, 394);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h2);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, form);
    			append_dev(form, input0);
    			set_input_value(input0, /*newUser*/ ctx[0].username);
    			append_dev(form, t2);
    			append_dev(form, input1);
    			set_input_value(input1, /*newUser*/ ctx[0].email);
    			append_dev(form, t3);
    			append_dev(form, input2);
    			set_input_value(input2, /*newUser*/ ctx[0].password);
    			append_dev(form, t4);
    			append_dev(form, input3);
    			set_input_value(input3, /*newUser*/ ctx[0].street);
    			append_dev(form, t5);
    			append_dev(form, input4);
    			set_input_value(input4, /*newUser*/ ctx[0].district);
    			append_dev(form, t6);
    			append_dev(form, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[3]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[4]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[5]),
    					listen_dev(input3, "input", /*input3_input_handler*/ ctx[6]),
    					listen_dev(input4, "input", /*input4_input_handler*/ ctx[7]),
    					listen_dev(form, "submit", prevent_default(/*handleSubmit*/ ctx[1]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*newUser*/ 1 && input0.value !== /*newUser*/ ctx[0].username) {
    				set_input_value(input0, /*newUser*/ ctx[0].username);
    			}

    			if (dirty & /*newUser*/ 1 && input1.value !== /*newUser*/ ctx[0].email) {
    				set_input_value(input1, /*newUser*/ ctx[0].email);
    			}

    			if (dirty & /*newUser*/ 1 && input2.value !== /*newUser*/ ctx[0].password) {
    				set_input_value(input2, /*newUser*/ ctx[0].password);
    			}

    			if (dirty & /*newUser*/ 1 && input3.value !== /*newUser*/ ctx[0].street) {
    				set_input_value(input3, /*newUser*/ ctx[0].street);
    			}

    			if (dirty & /*newUser*/ 1 && input4.value !== /*newUser*/ ctx[0].district) {
    				set_input_value(input4, /*newUser*/ ctx[0].district);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
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

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SignUp', slots, []);
    	let { signUp } = $$props;

    	let newUser = {
    		username: '',
    		email: '',
    		password: '',
    		street: '',
    		district: ''
    	};

    	function handleSubmit() {
    		signUp(newUser);

    		$$invalidate(0, newUser = {
    			username: '',
    			email: '',
    			password: '',
    			street: '',
    			district: ''
    		});
    	}

    	$$self.$$.on_mount.push(function () {
    		if (signUp === undefined && !('signUp' in $$props || $$self.$$.bound[$$self.$$.props['signUp']])) {
    			console.warn("<SignUp> was created without expected prop 'signUp'");
    		}
    	});

    	const writable_props = ['signUp'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SignUp> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		newUser.username = this.value;
    		$$invalidate(0, newUser);
    	}

    	function input1_input_handler() {
    		newUser.email = this.value;
    		$$invalidate(0, newUser);
    	}

    	function input2_input_handler() {
    		newUser.password = this.value;
    		$$invalidate(0, newUser);
    	}

    	function input3_input_handler() {
    		newUser.street = this.value;
    		$$invalidate(0, newUser);
    	}

    	function input4_input_handler() {
    		newUser.district = this.value;
    		$$invalidate(0, newUser);
    	}

    	$$self.$$set = $$props => {
    		if ('signUp' in $$props) $$invalidate(2, signUp = $$props.signUp);
    	};

    	$$self.$capture_state = () => ({ signUp, newUser, handleSubmit });

    	$$self.$inject_state = $$props => {
    		if ('signUp' in $$props) $$invalidate(2, signUp = $$props.signUp);
    		if ('newUser' in $$props) $$invalidate(0, newUser = $$props.newUser);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		newUser,
    		handleSubmit,
    		signUp,
    		input0_input_handler,
    		input1_input_handler,
    		input2_input_handler,
    		input3_input_handler,
    		input4_input_handler
    	];
    }

    class SignUp extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { signUp: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SignUp",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get signUp() {
    		throw new Error("<SignUp>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set signUp(value) {
    		throw new Error("<SignUp>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    // (186:3) {:else}
    function create_else_block(ctx) {
    	let login;
    	let current;
    	login = new Login({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(login.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(login, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(login.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(login.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(login, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(186:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (184:3) {#if currentView === 'signup'}
    function create_if_block_5(ctx) {
    	let signup;
    	let current;

    	signup = new SignUp({
    			props: { signUp: /*signUp*/ ctx[9] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(signup.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(signup, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(signup.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(signup.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(signup, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(184:3) {#if currentView === 'signup'}",
    		ctx
    	});

    	return block;
    }

    // (166:2) {#if isAuthenticated}
    function create_if_block(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_if_block_2, create_if_block_3, create_if_block_4];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*currentView*/ ctx[0] === 'dashboard') return 0;
    		if (/*currentView*/ ctx[0] === 'measurement') return 1;
    		if (/*currentView*/ ctx[0] === 'history') return 2;
    		if (/*currentView*/ ctx[0] === 'reports') return 3;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_1(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

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
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(166:2) {#if isAuthenticated}",
    		ctx
    	});

    	return block;
    }

    // (180:39) 
    function create_if_block_4(ctx) {
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
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(180:39) ",
    		ctx
    	});

    	return block;
    }

    // (178:39) 
    function create_if_block_3(ctx) {
    	let history;
    	let current;

    	history = new History({
    			props: {
    				measurements: /*measurements*/ ctx[1],
    				deleteMeasurement: /*deleteMeasurement*/ ctx[8]
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
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(178:39) ",
    		ctx
    	});

    	return block;
    }

    // (176:43) 
    function create_if_block_2(ctx) {
    	let measurementform;
    	let current;

    	measurementform = new MeasurementForm({
    			props: {
    				addMeasurement: /*addMeasurement*/ ctx[7],
    				setView: /*setView*/ ctx[10]
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
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(176:43) ",
    		ctx
    	});

    	return block;
    }

    // (167:3) {#if currentView === 'dashboard'}
    function create_if_block_1(ctx) {
    	let dashboard;
    	let current;

    	dashboard = new Dashboard({
    			props: {
    				measurements: /*measurements*/ ctx[1],
    				totalConsumption: /*totalConsumption*/ ctx[2],
    				averageConsumption: /*averageConsumption*/ ctx[3],
    				lastMeasurement: /*lastMeasurement*/ ctx[4],
    				setView: /*setView*/ ctx[10],
    				currentUser: /*currentUser*/ ctx[6]
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
    			if (dirty & /*currentUser*/ 64) dashboard_changes.currentUser = /*currentUser*/ ctx[6];
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
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(167:3) {#if currentView === 'dashboard'}",
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
    				setView: /*setView*/ ctx[10],
    				isAuthenticated: /*isAuthenticated*/ ctx[5]
    			},
    			$$inline: true
    		});

    	const if_block_creators = [create_if_block, create_if_block_5, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*isAuthenticated*/ ctx[5]) return 0;
    		if (/*currentView*/ ctx[0] === 'signup') return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(header.$$.fragment);
    			t = space();
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "container mx-auto p-4");
    			add_location(div, file, 164, 1, 4064);
    			attr_dev(main, "class", "min-h-screen bg-gray-100");
    			add_location(main, file, 161, 0, 3967);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t);
    			append_dev(main, div);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const header_changes = {};
    			if (dirty & /*currentView*/ 1) header_changes.currentView = /*currentView*/ ctx[0];
    			if (dirty & /*isAuthenticated*/ 32) header_changes.isAuthenticated = /*isAuthenticated*/ ctx[5];
    			header.$set(header_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
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
    			if_blocks[current_block_type_index].d();
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

    const API_URL = 'http://localhost:8080/api/measurements';
    const USER_API_URL = 'http://localhost:8080/api/users';

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let currentView = 'dashboard';
    	let measurements = [];
    	let totalConsumption = 0;
    	let averageConsumption = 0;
    	let lastMeasurement = null;
    	let isAuthenticated = false;
    	let token = null;
    	let currentUser = null; // New state variable for current user

    	auth.subscribe(value => {
    		$$invalidate(5, isAuthenticated = !!value.token);
    		token = value.token;

    		if (isAuthenticated) {
    			fetchMeasurements();
    			fetchCurrentUser(); // Fetch user details after authentication
    		} else {
    			$$invalidate(6, currentUser = null); // Clear user data on logout
    		}
    	});

    	onMount(() => {
    		auth.init();
    	});

    	async function fetchCurrentUser() {
    		try {
    			const response = await fetch(`${USER_API_URL}/${token}`, {
    				// Use token as userID
    				headers: {
    					'Authorization': token, // Send token for authorization
    					
    				}
    			});

    			if (response.ok) {
    				$$invalidate(6, currentUser = await response.json());
    			} else {
    				console.error('Failed to fetch current user');
    				$$invalidate(6, currentUser = null);
    			}
    		} catch(error) {
    			console.error('Error fetching current user:', error);
    			$$invalidate(6, currentUser = null);
    		}
    	}

    	async function fetchMeasurements() {
    		try {
    			const response = await fetch(API_URL, { headers: { 'Authorization': token } });

    			if (response.ok) {
    				$$invalidate(1, measurements = await response.json());

    				if (measurements === null) {
    					$$invalidate(1, measurements = []);
    				}

    				updateStats();
    			} else {
    				console.error('Failed to fetch measurements');
    			}
    		} catch(error) {
    			console.error('Error fetching measurements:', error);
    		}
    	}

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

    	async function addMeasurement(measurement) {
    		try {
    			const response = await fetch(API_URL, {
    				method: 'POST',
    				headers: {
    					'Content-Type': 'application/json',
    					'Authorization': token
    				},
    				body: JSON.stringify(measurement)
    			});

    			if (response.ok) {
    				const newMeasurement = await response.json();
    				$$invalidate(1, measurements = [...measurements, newMeasurement]);
    				updateStats();
    			} else {
    				console.error('Failed to add measurement');
    			}
    		} catch(error) {
    			console.error('Error adding measurement:', error);
    		}
    	}

    	async function deleteMeasurement(id) {
    		try {
    			const response = await fetch(`${API_URL}/${id}`, {
    				method: 'DELETE',
    				headers: { 'Authorization': token }
    			});

    			if (response.ok) {
    				$$invalidate(1, measurements = measurements.filter(m => m.id !== id));
    				updateStats();
    			} else {
    				console.error('Failed to delete measurement');
    			}
    		} catch(error) {
    			console.error('Error deleting measurement:', error);
    		}
    	}

    	async function signUp(user) {
    		try {
    			const response = await fetch(USER_API_URL, {
    				method: 'POST',
    				headers: { 'Content-Type': 'application/json' },
    				body: JSON.stringify(user)
    			});

    			if (response.ok) {
    				setView('login');
    			} else {
    				console.error('Failed to sign up');
    			}
    		} catch(error) {
    			console.error('Error signing up:', error);
    		}
    	}

    	function setView(view) {
    		$$invalidate(0, currentView = view);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		onMount,
    		Header,
    		Dashboard,
    		MeasurementForm,
    		History,
    		Reports,
    		Login,
    		SignUp,
    		auth,
    		currentView,
    		measurements,
    		totalConsumption,
    		averageConsumption,
    		lastMeasurement,
    		API_URL,
    		USER_API_URL,
    		isAuthenticated,
    		token,
    		currentUser,
    		fetchCurrentUser,
    		fetchMeasurements,
    		updateStats,
    		addMeasurement,
    		deleteMeasurement,
    		signUp,
    		setView
    	});

    	$$self.$inject_state = $$props => {
    		if ('currentView' in $$props) $$invalidate(0, currentView = $$props.currentView);
    		if ('measurements' in $$props) $$invalidate(1, measurements = $$props.measurements);
    		if ('totalConsumption' in $$props) $$invalidate(2, totalConsumption = $$props.totalConsumption);
    		if ('averageConsumption' in $$props) $$invalidate(3, averageConsumption = $$props.averageConsumption);
    		if ('lastMeasurement' in $$props) $$invalidate(4, lastMeasurement = $$props.lastMeasurement);
    		if ('isAuthenticated' in $$props) $$invalidate(5, isAuthenticated = $$props.isAuthenticated);
    		if ('token' in $$props) token = $$props.token;
    		if ('currentUser' in $$props) $$invalidate(6, currentUser = $$props.currentUser);
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
    		isAuthenticated,
    		currentUser,
    		addMeasurement,
    		deleteMeasurement,
    		signUp,
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
