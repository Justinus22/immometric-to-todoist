// on load
$(function () {

    window.dataLayer = window.dataLayer || [];

    gtag('js', new Date());
    if ($('#uid').length) {
        uid = $('#uid').text();
        gtag('set', {'user_id': uid});
    }
    gtag('config', 'UA-128688874-1');

    $('.link2portal').on("click", function () {
        console.log('link clicked')
        logOutboundLink(this.innerText)
    });

});


//global

function gtag() {
    dataLayer.push(arguments);
}

var logOutboundLink = function (label) {
    gtag('event', 'click', {
        'event_category': 'outbound',
        'event_label': label,
        'transport_type': 'beacon',
    });
}

