!function (t, e) {
    var o, n, p, r;
    e.__SV || (window.posthog = e, e._i = [], e.init = function (i, s, a) {
        function g(t, e) {
            var o = e.split(".");
            2 == o.length && (t = t[o[0]], e = o[1]), t[e] = function () {
                t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
            }
        }

        (p = t.createElement("script")).type = "text/javascript", p.async = !0, p.src = s.api_host + "/static/array.js", (r = t.getElementsByTagName("script")[0]).parentNode.insertBefore(p, r);
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
posthog.init(document.querySelector('#posthog_tag').textContent,
    {
        api_host: 'https://app.posthog.com',
        disable_session_recording: true, // only for registered users (see below)
    })
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

alternatives = JSON.parse(document.querySelector('#alternatives').textContent);
let properties = {};
for (let [exp, alternative] of Object.entries(alternatives)) {
    properties[exp] = alternative;
}
if (Object.keys(properties).length > 0) {
    posthog.capture('set alternative', {
        $set: properties,
    });
}

//handle cross-domain tracking
document.addEventListener('DOMContentLoaded', function () {
    // Function to extract the PostHog ID ('phid') from the URL
    function getPostHogIDFromURL() {
        var params = new URLSearchParams(window.location.search);
        var phid = params.get('phid');
        if (phid) {
            params.delete('phid'); // Remove 'phid' from URL
            var newQueryString = params.toString();
            var newUrl = window.location.pathname + (newQueryString ? '?' + newQueryString : '') + window.location.hash;
            window.history.replaceState({}, '', newUrl);
        }
        return phid;
    }

    // Function to identify the user in PostHog with retry limit
    function identifyUserWithPostHog(phid, attempt = 0) {
        if (window.posthog && phid) {
            posthog.identify(phid);
        } else if (!window.posthog && attempt < 10) { // Limit to 10 attempts
            setTimeout(function () {
                identifyUserWithPostHog(phid, attempt + 1);
            }, 1000);
        }
    }

    var postHogID = getPostHogIDFromURL();
    if (postHogID) {
        identifyUserWithPostHog(postHogID);
    }
});
