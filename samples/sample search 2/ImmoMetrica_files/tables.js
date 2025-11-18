
var language = {
    "sEmptyTable": "Keine Daten in der Tabelle vorhanden",
    "sInfo": "_START_ bis _END_ von _TOTAL_ Einträgen",
    "sInfoEmpty": "Keine Daten vorhanden",
    "sInfoFiltered": "(gefiltert von _MAX_ Einträgen)",
    "sInfoPostFix": "",
    "sInfoThousands": ".",
    "sLengthMenu": "_MENU_ Einträge anzeigen",
    "sLoadingRecords": "Wird geladen ..",
    "sProcessing": "Bitte warten ..",
    "sSearch": "Suchen",
    "sZeroRecords": "Keine Einträge vorhanden",
    "oPaginate": {
        "sFirst": "Erste",
        "sPrevious": "Zurück",
        "sNext": "Nächste",
        "sLast": "Letzte"
    },
    "oAria": {
        "sSortAscending": ": aktivieren, um Spalte aufsteigend zu sortieren",
        "sSortDescending": ": aktivieren, um Spalte absteigend zu sortieren"
    },
    "select": {
        "rows": {
            "_": "%d Zeilen ausgewählt",
            "0": "",
            "1": "1 Zeile ausgewählt"
        }
    },
    "buttons": {
        "print": "Drucken",
        "colvis": "Spalten wählen",
        "copy": "Kopieren",
        "copyTitle": "In Zwischenablage kopieren",
        "copyKeys": "Taste <i>ctrl</i> oder <i>\u2318</i> + <i>C</i> um Tabelle<br>in Zwischenspeicher zu kopieren.<br><br>Um abzubrechen die Nachricht anklicken oder Escape drücken.",
        "copySuccess": {
            "_": "%d Zeilen kopiert",
            "1": "1 Zeile kopiert"
        },
        "pageLength": {
            "-1": "Zeige alle Zeilen",
            "_": "Zeige %d Zeilen"
        }
    }
};
jQuery.extend( true, jQuery.fn.dataTable.defaults, {
    "language": language,
} );

jQuery.extend( jQuery.fn.dataTableExt.oSort, {
    "numeric-comma-pre": function ( a ) {
        // replace html
        var x = String(a).replace(/<[\s\S]*?>/g, "").trim();
        // replace comma with dot and vice versa
        x = (x === "—") ? 0 : x.replace(/[.,]/g, function(r) {
            return r === ',' ? '.' : '';
        });
        return parseFloat(x);
    },

    "numeric-comma-asc": function ( a, b ) {
        return ((a < b) ? -1 : ((a > b) ? 1 : 0));
    },

    "numeric-comma-desc": function ( a, b ) {
        return ((a < b) ? 1 : ((a > b) ? -1 : 0));
    }
} );
