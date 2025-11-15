// on load
(function ($) {
  $.fn.shorten = function (settings) {
    "use strict";

    var config = {
      showChars: 200,
      minHideChars: 10,
      ellipsesText: "...",
      moreText: "mehr",
      lessText: "weniger",
      onLess: function () {},
      onMore: function () {},
      errMsg: null,
      force: false,
    };

    if (settings) {
      $.extend(config, settings);
    }

    if ($(this).data("jquery.shorten") && !config.force) {
      return false;
    }
    $(this).data("jquery.shorten", true);

    $(document).off("click", ".morelink");

    $(document).on(
      {
        click: function () {
          var $this = $(this);
          if ($this.hasClass("less")) {
            $this.removeClass("less");
            $this.html(config.moreText);
            $this
              .parent()
              .prev()
              .animate({ height: "0" + "%" }, function () {
                $this.parent().prev().prev().show();
              })
              .hide("fast", function () {
                config.onLess();
              });
          } else {
            $this.addClass("less");
            $this.html(config.lessText);
            $this
              .parent()
              .prev()
              .animate({ height: "100" + "%" }, function () {
                $this.parent().prev().prev().hide();
              })
              .show("fast", function () {
                config.onMore();
              });
          }
          return false;
        },
      },
      ".morelink"
    );

    return this.each(function () {
      var $this = $(this);

      var content = $this.html();
      var contentlen = $this.text().length;
      if (contentlen > config.showChars + config.minHideChars) {
        var c = content.substr(0, config.showChars);
        if (c.indexOf("<") >= 0) {
          // If there's HTML don't want to cut it
          var inTag = false; // I'm in a tag?
          var bag = ""; // Put the characters to be shown here
          var countChars = 0; // Current bag size
          var openTags = []; // Stack for opened tags, so I can close them later
          var tagName = null;

          for (var i = 0, r = 0; r <= config.showChars; i++) {
            if (content[i] == "<" && !inTag) {
              inTag = true;

              // This could be "tag" or "/tag"
              tagName = content.substring(i + 1, content.indexOf(">", i));

              // If its a closing tag
              if (tagName[0] == "/") {
                if (tagName != "/" + openTags[0]) {
                  config.errMsg =
                    "ERROR en HTML: the top of the stack should be the tag that closes";
                } else {
                  openTags.shift(); // Pops the last tag from the open tag stack (the tag is closed in the retult HTML!)
                }
              } else {
                // There are some nasty tags that don't have a close tag like <br/>
                if (tagName.toLowerCase() != "br") {
                  openTags.unshift(tagName); // Add to start the name of the tag that opens
                }
              }
            }
            if (inTag && content[i] == ">") {
              inTag = false;
            }

            if (inTag) {
              bag += content.charAt(i);
            } // Add tag name chars to the result
            else {
              r++;
              if (countChars <= config.showChars) {
                bag += content.charAt(i); // Fix to ie 7 not allowing you to reference string characters using the []
                countChars++;
              } // Now I have the characters needed
              else {
                if (openTags.length > 0) {
                  // I have unclosed tags
                  //console.log('They were open tags');
                  //console.log(openTags);
                  for (j = 0; j < openTags.length; j++) {
                    //console.log('Cierro tag ' + openTags[j]);
                    bag += "</" + openTags[j] + ">"; // Close all tags that were opened

                    // You could shift the tag from the stack to check if you end with an empty stack, that means you have closed all open tags
                  }
                  break;
                }
              }
            }
          }
          c = $("<div/>")
            .html(
              bag + '<span class="ellip">' + config.ellipsesText + "</span>"
            )
            .html();
        } else {
          c += config.ellipsesText;
        }

        var html =
          '<div class="shortcontent">' +
          c +
          '</div><div class="allcontent">' +
          content +
          '</div><span><a href="javascript://nop/" class="morelink">' +
          config.moreText +
          "</a></span>";

        $this.html(html);
        $this.find(".allcontent").hide(); // Hide all text
        $(".shortcontent p:last", $this).css("margin-bottom", 0); //Remove bottom margin on last paragraph as it's likely shortened
      }
    });
  };
})(jQuery);

$(function () {
  var appData = JSON.parse($('#app-data').text());
  //add on click
  $("#btn-send-offerfeedback").on("click", function () {
    var csrftoken = jQuery("[name=csrfmiddlewaretoken]").val();
    $('#offerfeedbackbox .invalid-feedback').html('');
    $('#offerfeedbackbox .is-invalid').removeClass('is-invalid');
    $.post(
      "/" + appData.country + "/offerfeedback",
      {
        feedback_type: $('#offerfeedback_feedback_type').val(),
        feedback_text: $('#offerfeedback_feedback_text').val(),
        offer: $('#offerfeedback_offer').val(),
        csrfmiddlewaretoken: csrftoken
      },
      function (data, status) {
        if (status === 'success' && data.success) {
          $('#offerfeedbackbox').modal('hide');
          $('#feedbacktext').val('');
          $('#feedbackthanks .modal-body').html(data.message);
          $('#feedbackthanks').modal('show');
        } else {
          alert("Data: " + data + "\nStatus: " + status);
        }
      }
    ).fail(function (jqXHR) {
      let uncaught = true;
      if (jqXHR.responseJSON && jqXHR.responseJSON.errors) {
        uncaught = !showFieldErrors("offerfeedback_", jqXHR.responseJSON.errors);
      }
      if (uncaught) {
        // uncaught errors in form validation or request limit hit
        $('#offerfeedbackbox').modal('hide');
        alert("Das hat leider nicht geklappt. Probieren Sie es bitte später nocheinmal.")
      }
    });
  });
  $("#offerfeedback_feedback_type").on("change", function () {
    let descriptionContainer = $("#offerfeedback_description");
    if (this.value === "other") {
      descriptionContainer.show();
    } else {
      descriptionContainer.hide();
    }
  });
});



$(document).ready(function () {
  $(".shortened").shorten();

  $(".shortened-small").shorten({ showChars: 10 });

  if (window.innerWidth >= 768) {
    const collapseElements = document.querySelectorAll("main .collapse");
    collapseElements.forEach((collapseElement) => {
      const bsCollapse = new bootstrap.Collapse(collapseElement, {
        show: true, // Automatically show the collapsible content
      });
    });
  }
});
