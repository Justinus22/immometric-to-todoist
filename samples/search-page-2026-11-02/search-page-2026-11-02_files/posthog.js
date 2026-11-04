!function (t, e) {
    var o, n, p, r;
    e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) {
        function g(t, e) {
            var o = e.split(".");
            2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
            }
        }

        (p = t.createElement("script")).type = "text/javascript", p.async = !0, p.src = s.api_host.replace(".i.posthog.com", "-assets.i.posthog.com") + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r);
        var u = e;
        for (void 0 !== a ? u = e[a] = [] : a = "posthog", u.people = u.people || [], u.toString = function (t) {
            var e = "posthog";
            return "posthog" !== a && (e += "." + a), t || (e += " (stub)"), e
        }, u.people.toString = function () {
            return u.toString(1) + ".people (stub)"
        }, o = "capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags".split(" "), n = 0; n < o.length; n++) g(u, o[n]);
        e._i.push([i, s, a])
    }, e.__SV = 1)
}(document, window.posthog || []);

// Only the shape posthog-js actually mints. `?phid=` is a stranger's string, and
// one shaped like get_analytics_uid() merges this visitor into that account —
// the same reason services/signup_funnel.py checks it server-side.
var HANDOVER_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function extractHandoverId() {
    var params = new URLSearchParams(window.location.search);
    var phid = params.get('phid');
    if (phid !== null) {
        // Still stripped when it is junk: leaving it in the URL only means the
        // next navigation carries it back in.
        params.delete('phid');
        var newQueryString = params.toString();
        var newUrl = window.location.pathname + (newQueryString ? '?' + newQueryString : '') + window.location.hash;
        window.history.replaceState({}, '', newUrl);
        return HANDOVER_RE.test(phid) ? phid : null;
    }
    var next = params.get('next');
    if (next && next.indexOf('?') !== -1) {
        var nested = new URLSearchParams(next.slice(next.indexOf('?') + 1)).get('phid');
        return nested && HANDOVER_RE.test(nested) ? nested : null;
    }
    return null;
}

function hasExistingPosthogState(token) {
    var key = 'ph_' + token + '_posthog';
    try {
        if (window.localStorage && window.localStorage.getItem(key)) {
            return true;
        }
    } catch (e) {
    }
    return document.cookie.indexOf(key + '=') !== -1;
}

var posthogToken = document.querySelector('#posthog_tag').textContent;
var handoverId = extractHandoverId();

// Every route whose path argument `crm/visitor.py`'s SECRET_KWARGS names carries a
// credential, and posthog-js puts the path in `$current_url`, `$pathname` and the
// next page's `$referrer`. An email-confirmation key, a password-reset key, an
// account's deletion link or a partner deeplink that grants a free year is a way
// into an account for anybody who can read a chart, so the segment is replaced
// before the event leaves the browser rather than cleaned up in PostHog
// afterwards — in the path and as the login page's percent-encoded `next=`.
// test_posthog_redaction_e2e.py fails on a keyed route missing here.
// `%(?:25)*`: a `next=` nested in another one is encoded twice.
var SLASH = '(?:/|%(?:25)*2F)';
function secretPathRe(route, value) {
    return new RegExp('(' + SLASH + route.split('/').join(SLASH) + SLASH + ')' + value, 'gi');
}
var SECRET_PATH_RES = ['accounts/password/reset/key', 'accounts/confirm-email', 'profile/delete/confirm', 'nda_confirm', 'voucher']
    .map(function (route) { return secretPathRe(route, '[^/?#&]+'); })
    // `<ciphertext>/<nonce>/<tag>`: these cross `/` on purpose.
    .concat(['unsubscribe', 'mailinglist/preferences', 'immocation/masterclass', 'kicafe', 'offer/goto']
        .map(function (route) { return secretPathRe(route, '[^?#&]+'); }))
    // sesame's login link: its middleware leaves `?authtoken=` in a Safari tab's URL.
    .concat([/((?:[?&]|%(?:25)*3F|%(?:25)*26)(?:auth)?token(?:=|%(?:25)*3D))[^&#]+/gi])
    // ImmoCustomerHub's heatmap and mail links, until its SDK drops them, which may load after this.
    .concat([/(#ich-(?:heatmap|contact)=)[\w.-]+/g]);
var URLISH_KEYS = [
    '$current_url', '$pathname', '$referrer', '$initial_current_url', '$initial_pathname', '$initial_referrer',
    '$session_entry_url', '$session_entry_pathname', '$session_entry_referrer', '$prev_pageview_pathname',
];

function redactSecrets(value) {
    if (typeof value !== 'string') {
        return value;
    }
    // Every pattern, not the first match: a heatmap link can open one of the secret paths.
    for (var i = 0; i < SECRET_PATH_RES.length; i++) {
        value = value.replace(SECRET_PATH_RES[i], '$1redacted');
    }
    return value;
}

// `$web_vitals` is autocaptured per page view (enabled project-side), which at
// this app's volume is a second stream the size of `$pageview` itself. Core Web
// Vitals are read as a p75, and a p75 over a random sample is the same number —
// what shrinks is the count, not the metric.
//
// 0.5 %, raised from the 0.1 % this started at — the "raise it if a page ever
// has to be tuned" the previous comment here invited. At ~12 000 page views a
// day that is ~60 measurements rather than ~12: a site-wide trend that moves in
// days instead of weeks, plus a rough weekly read on the single busiest route.
// Not a per-route number.
//
// Deliberately not higher, and the reason is the bill rather than the
// statistics. **PostHog charges per event; SigNoz is self-hosted**, so every
// step up here is a recurring cost while the same measurement in SigNoz costs
// ClickHouse disk we already own. That asymmetry is the argument for moving
// Core Web Vitals to a server-side, unsampled metric rather than buying
// resolution one rate bump at a time — see #1466, which holds that decision.
// Anyone about to raise this again should read that issue first.
//
// Written out rather than imported from `posthog-js/customizations`: the
// snippet below is the array stub, so `posthog.before_send.sampleByEvent` does
// not exist yet at `init()` time.
//
// Only this one event. PostHog's own guidance is that its internal events are
// otherwise needed whole, and `$pageview` / `$pageleave` are what web analytics
// counts.
var WEB_VITALS_SAMPLE_RATE = 0.005;

function sampleWebVitals(event) {
    if (event && event.event === '$web_vitals' && Math.random() >= WEB_VITALS_SAMPLE_RATE) {
        return null;
    }
    return event;
}

var posthogConfig = {
    // The regional host, not app.posthog.com: the library rewrites that one to
    // this anyway, and only this form yields the asset origin the v2 CSP names.
    api_host: 'https://us.i.posthog.com',
    disable_session_recording: true,
    // Host-only: a domain-wide one would go out with every request to meet.immometrica.com.
    cross_subdomain_cookie: false,
    before_send: sampleWebVitals,
    sanitize_properties: function (properties) {
        for (var i = 0; i < URLISH_KEYS.length; i++) {
            var key = URLISH_KEYS[i];
            if (properties[key]) {
                properties[key] = redactSecrets(properties[key]);
            }
        }
        return properties;
    }
};
if (handoverId && !hasExistingPosthogState(posthogToken)) {
    posthogConfig.bootstrap = {distinctID: handoverId};
    handoverId = null;
}
posthog.init(posthogToken, posthogConfig);
// Opened from the home screen or in a browser tab, on every event — how many
// install the app. docs/frontend-v2.md, "The home-screen app".
posthog.register({
    display_mode: navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
});

if (handoverId) {
    posthog.alias(handoverId);
}

window.posthog.onFeatureFlags(function () {
    let uid = document.querySelector('#uid');
    if (uid) {
        posthog.identify(uid.textContent);
        posthog.startSessionRecording();
    }

    if (posthog.isFeatureEnabled('disable-autocapture')) {
        posthog.config.autocapture = false;
    }


});

// v2 pages carry no split-test block, and a missing element here used to throw
// before the identify above had a chance to run.
let alternativesEl = document.querySelector('#alternatives');
let alternatives = alternativesEl ? JSON.parse(alternativesEl.textContent) : {};
let properties = {};
for (let [exp, alternative] of Object.entries(alternatives)) {
    properties[exp] = alternative;
}

// A split-test assignment is decided once and then stored — in the session for
// a visitor, on the profile for an account — so this `$set` carried the same
// values on every page load for the life of the browser. That was 1.04 million
// events in 90 days, the second-largest stream in the project after
// `$pageview`, to set properties PostHog already had (#1107). Sent only when
// the assignment is new or has changed; a browser that refuses storage keeps
// the old behaviour rather than losing the property.
var ALTERNATIVES_KEY = 'im_alternatives_sent';

function alternativesAlreadySent(serialized) {
    try {
        return window.localStorage.getItem(ALTERNATIVES_KEY) === serialized;
    } catch (e) {
        return false;
    }
}

function rememberAlternatives(serialized) {
    try {
        window.localStorage.setItem(ALTERNATIVES_KEY, serialized);
    } catch (e) {
    }
}

if (Object.keys(properties).length > 0) {
    // Key order comes from the same server-side dict on every render, so a
    // plain stringify is a stable fingerprint.
    var serializedAlternatives = JSON.stringify(properties);
    if (!alternativesAlreadySent(serializedAlternatives)) {
        rememberAlternatives(serializedAlternatives);
        posthog.capture('set alternative', {
            $set: properties,
        });
    }
}
