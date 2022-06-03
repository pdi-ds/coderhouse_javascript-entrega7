const currency = {
    ARS: { id: "pesos argentinos", data: { USD: 0.0086, CLP: 7.41, EUR: 0.0081 }, },
    USD: { id: "dólares americanos", data: { ARS: 117.0, CLP: 866.85, EUR: 0.95 }, },
    CLP: { id: "pesos chilenos", data: { ARS: 0.13, USD: 0.0012, EUR: 0.0011 }, },
    EUR: { id: "euros", data: { ARS: 123.12, USD: 1.05, CLP: 912.75 }, },
};
Object.defineProperties(
    currency, {
    curGET: { value: function (exclude = []) { let options = Object.keys(this); exclude.length > 0 && (options = options.filter(value => exclude.includes(value) === false)); return options; }.bind(currency) },
    curOPT: { value: function (exclude = [], join = true) { let options = this.curGET(exclude); return join === true ? options.join(', ') : options; }.bind(currency) },
    curCONV: { value: function (from, to, amout) { return amout * this[from].data[to]; }.bind(currency) },
}
);
const fail = 'fail';
const div = 'div';
const locDATA = { user: '', from: 'ARS', amount: 100, to: ['USD'] };
const strDTS = {};
(function () {
    const str = { ...locData };
    Object.keys(locData).forEach(key => {
        Object.defineProperty(strDTS, key, {
            get: () => {
                let storage = null;
                try { storage = JSON.parse(localStorage.getItem(key)); }
                catch (e) { log('LocaleStorage in enabled'); }
                return storage?.value || str[key];
            },
            set: value => {
                try { localStorage.setItem(key, JSON.stringify({ value })); }
                catch (e) { log('LocaleStorage in enabled'); }
                str[key] = value;
            },
        });
        strDTS[key] = strDTS[key] || locData[key];
    });
})();
const call = {
    'sN1': function () {
        let next = this.querySelector('button[data-role="next"]'), input = this.querySelector('input[name="user"]');
        input.value = strDTS.user;
        addEventListenerOnce(next, 'click', e => {
            let user = input.value;
            if (user === null || user === '') { validate({ input, message: 'Por favor, ingresá un usuario:' }); }
            else { strDTS.user = user; clear(input); usrStep('sN2') }
        });
    },
    'sN2': function () {
        let select = this.querySelector('select'), input = this.querySelector('input[name="amount"]')
        prev = this.querySelector('button[data-role="previous"]'), next = this.querySelector('button[data-role="next"]'), currencies = [];
        (select.querySelectorAll('option:not([value=""])') || []).forEach(node => select.removeChild(node));
        currencies = currency.curGET().map(function (type) {
            let option = document.createElement('option');
            option.value = type
            option.textContent = currency[type].id; type === strDTS.from && (option.selected = true); return option;
        });
        select.append.apply(select, currencies);
        input.value = strDTS.amount;
        addEventListenerOnce(prev, 'click', e => { usrStep('sN1'); });
        addEventListenerOnce(next, 'click', e => {
            let from = select.value, amount = input.value, passed = []
            reset = false;
            if (from === null || convertible(from) === false) { validate({ input: select, message: 'Por favor, seleccioná una moneda inicial válida' }); }
            else { clear(select); passed.push('from'); }
            if (amount === '') { validate({ input, message: 'Ingresá un monto para convertir', replace: true }); }
            else if (_number(amount) === false) { validate({ input, message: 'Por favor, ingresá un monto válido', replace: true }); }
            else if (Number(amount) <= 0) { validate({ input, message: 'Por favor, ingresá un número que no sea cero', replace: true }); }
            else { clear(input); passed.push('amount'); }
            if (passed.length === 2) { reset = from !== strDTS.from; strDTS.amount = Number(amount); strDTS.from = from; usrStep('sN3', [{ reset }]); }
        });
    },
    'sN3': function ({ reset } = { reset: false }) {
        function reg(selected = false) {
            let container = document.createElement('div'), currencies = [], select;
            container.className = 'converting';
            container.innerHTML = '<div class="form-row">' + '<label>Seleccioná la moneda final:</label>' + '<select name="from">' + '<option value=""></option>' + '</select>' + '</div>';
            currencies = currency.curGET(strDTS.from).map(function (type) {
                let option = document.createElement('option');
                option.value = type
                option.textContent = currency[type].id;
                (selected !== false && type === selected) && (option.selected = true);
                return option;
            });
            select = container.querySelector('select');
            select.append.apply(select, currencies);
            return container;
        }
        let container = this.querySelector('.conversions'), prev = this.querySelector('button[data-role="previous"]'), next = this.querySelector('button[data-role="next"]'), current = container.querySelectorAll('.converting'), selects = [];
        if (current.length <= 1 || reset === true) {
            (current || []).forEach(node => container.removeChild(node));
            selects = [currency.curGET(strDTS.from)[0], ''].map((code) => { return reg(code); });
            container.append.apply(container, selects);
        }
        addEventListenerOnce(container, 'change', e => {
            let target = e.target, selects = container.querySelectorAll('select'), empty = [];
            selects.forEach(select => { if (select.value === '') empty.push(select); });
            target.value !== '' && clear(target);
            (target.matches('select') && target.value !== '' && selects.length < currency.curGET(strDTS.from).length && empty.length === 0) && container.append(reg());
        });
        addEventListenerOnce(prev, 'click', e => { usrStep('sN2'); });
        addEventListenerOnce(next, 'click', e => {
            let selects = container.querySelectorAll('select'), currencies = [];
            selects.forEach(select => { let value = select.value; value !== '' && currencies.push(select.value); });
            if (currencies.length === 0) { validate({ input: selects[0], message: 'Tenes que seleccionar una moneda' }); }
            else { strDTS.to = currencies.filter((value, index) => currencies.indexOf(value) === index); usrStep('sN4'); }
        });
    },
    'sN4': function () {
        function extraCONV({ text }) {
            let converting = document.createElement('div'), _text = document.createElement('p');
            converting.className = 'converting';
            _text.textContent = text;
            converting.append(_text);
            return converting;
        }
        let container = this.querySelector('.conversions'), prev = this.querySelector('button[data-role="previous"]'), restart = this.querySelector('button[data-role="restart"]'), conversions = [];
        addEventListenerOnce(prev, 'click', e => { usrStep('sN3'); });
        addEventListenerOnce(restart, 'click', e => {
            let container = document.querySelector('[data-step="sN3"] .conversions');
            (container.querySelectorAll('.converting') || []).forEach(node => container.removeChild(node));
            usrStep('sN2');
        });
        (container.querySelectorAll('.converting') || []).forEach(node => container.removeChild(node));
        conversions = strDTS.to.map(value => {
            let { from, amount } = strDTS,
                converted = currency.curCONV(from, value, amount);
            return { text: `$${amount} ${currency[from].id.toLowerCase()} = $${converted} ${currency[value].id.toLowerCase()}` };
        });
        container.append.apply(container, conversions.map(extraCONV));
    }
};
function _number(value) { return !isNaN(parseInt(value)); }
function convertible(type) { return currency.curGET().includes(type.toUpperCase()); }
function validate({ input, message, replace = false }) {
    if (input.parentNode.querySelector(`${div}.${fail}`) === null) {
        let alert = document.createElement(div);
        alert.className = fail;
        alert.textContent = message;
        input.className = fail;
        input.parentNode.insertBefore(alert, input.nextSibling);
    }
    else if (replace === true) { input.parentNode.querySelector(`${div}.${fail}`).textContent = message; } input.focus();
}
function clear(input) { let alert = input.parentNode.querySelector(`${div}.${fail}`); input.className = ''; alert !== null && alert.remove(); }
function addEventListenerOnce(element, event, callcback) {
    let attribute = 'data-attached', attached = element.getAttribute(attribute) !== null;
    if (attached === false) {
        element.setAttribute(attribute, '1');
        element.addEventListener(event, callcback);
    }
}
function usrStep(user, args = []) {
    let container = document.querySelector('.container'), step = container.querySelector(`[data-step="${user}"]`), callback;
    if (step !== null) {
        container.querySelectorAll('[data-step]').forEach(current => {
            current.className = '';
        });
        callback = usrStep.getAttribute('data-callback');
        (callback !== null && call[callback]) && call[callback].call(step, ...args); step.className = 'current';
    }
}
usrStep('sN1');