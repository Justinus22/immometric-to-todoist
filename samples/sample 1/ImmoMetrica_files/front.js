var preventspinner = false;

$(document).ready(function () {
  "use strict";

  // ------------------------------------------------------- //
  // Search Box
  // ------------------------------------------------------ //
  $("#search").on("click", function (e) {
    e.preventDefault();
    $(".search-box").fadeIn();
  });
  $(".dismiss").on("click", function () {
    $(".search-box").fadeOut();
  });

  // ------------------------------------------------------- //
  // Card Close
  // ------------------------------------------------------ //
  $(".card-close a.remove").on("click", function (e) {
    e.preventDefault();
    $(this).parents(".card").fadeOut();
  });

  // ------------------------------------------------------- //
  // Adding fade effect to dropdowns
  // ------------------------------------------------------ //
  $(".dropdown").on("show.bs.dropdown", function () {
    $(this).find(".dropdown-menu").first().stop(true, true).fadeIn();
  });
  $(".dropdown").on("hide.bs.dropdown", function () {
    $(this).find(".dropdown-menu").first().stop(true, true).fadeOut();
  });

  // ------------------------------------------------------- //
  // Sidebar Functionality
  // ------------------------------------------------------ //
  $("#sidebar-overlay").on("click", function () {
    $("#toggle-btn").click();
  });

  $("#toggle-btn, #nav-collapse").on("click", function (e) {
    e.preventDefault();

    $(document).trigger("sidebarChanged");
    $(".content-inner").toggleClass("active");

    if ($(window).innerWidth() >= 1200) {
      $(".side-navbar").toggleClass("collapsed");
      $("#nav-collapse").toggleClass("collapsed");
      $(".sidebar").toggleClass("collapsed");
      $(".hide-collpased").toggleClass("d-none");
      if ($("#toggle-btn").hasClass("active")) {
        $(".navbar-header .brand-small").hide();
        $(".navbar-header .brand-big").show();
      } else {
        $(".navbar-header .brand-small").show();
        $(".navbar-header .brand-big").hide();
      }
    } else {
      $("#toggle-btn").toggleClass("active");
      $(".side-navbar").toggleClass("shrinked");
      $(".sidebar").toggleClass("shrinked");
      $(".navbar-header .brand-small").show();
      if ($(".side-navbar").hasClass("shrinked")) {
        if ("localStorage" in window) {window.localStorage.setItem("sidebarState", "shrinked");}
        $("#sidebar-overlay").removeClass("d-none");
      } else {
          if ("localStorage" in window) {window.localStorage.setItem("sidebarState", "expanded");}
        $("#sidebar-overlay").addClass("d-none");
      }
    }
  });

  // ------------------------------------------------------- //
  // Universal Form Validation
  // ------------------------------------------------------ //

  $(".form-validate").each(function () {
    $(this).validate({
      errorElement: "div",
      errorClass: "is-invalid",
      validClass: "is-valid",
      ignore:
        ":hidden:not(.summernote, .checkbox-template, .form-control-custom),.note-editable.card-block",
      errorPlacement: function (error, element) {
        // Add the `invalid-feedback` class to the error element
        error.addClass("invalid-feedback");
        console.log(element);
        if (element.prop("type") === "checkbox") {
          error.insertAfter(element.siblings("label"));
        } else {
          error.insertAfter(element);
        }
      },
    });
  });

  // ------------------------------------------------------- //
  // Material Inputs
  // ------------------------------------------------------ //

  var materialInputs = $("input.input-material");

  // activate labels for prefilled values
  materialInputs
    .filter(function () {
      return $(this).val() !== "";
    })
    .siblings(".label-material")
    .addClass("active");

  // move label on focus
  materialInputs.on("focus", function () {
    $(this).siblings(".label-material").addClass("active");
  });

  // remove/keep label on blur
  materialInputs.on("blur", function () {
    $(this).siblings(".label-material").removeClass("active");

    if ($(this).val() !== "") {
      $(this).siblings(".label-material").addClass("active");
    } else {
      $(this).siblings(".label-material").removeClass("active");
    }
  });

  // ------------------------------------------------------- //
  // External links to new window
  // ------------------------------------------------------ //
  $(".external").on("click", function (e) {
    e.preventDefault();
    window.open($(this).attr("href"));
  });

  // document.querySelectorAll('a:not(.nospinner), input[type="submit"]').forEach(anchor => {
  // anchor.addEventListener('click', function (e) {
  //     preventspinner = false
  //     setTimeout(function() {
  //     if (preventspinner == false) {
  //             $('body').append('<div class="loading"></div>');
  //         }
  //         }, 3000);
  //     });
  // });

  jQuery("form input").on("invalid", function (event) {
    preventspinner = true;
  });

  $(window).bind("unload", function () {
    $(".loading").remove();
  });
  $(".double-submit").preventDoubleSubmission();
});

jQuery.fn.preventDoubleSubmission = function () {
  const buttons = $(this).find("button,input[type=submit]:not(:disabled)");
  const $form = $(this);

  function isValid() {
    return (
      $form.valid() &&
      $form.find(".is-invalid,.StripeElement--invalid").length === 0
    );
  }

  $(this).on("submit", function () {
    if (isValid()) {
      buttons.prop("disabled", true);
      // reenable after 1 second if validation errors found (e.g. from stripe)
      setTimeout(function () {
        if (!isValid()) {
          buttons.prop("disabled", false);
        }
      }, 1000);
    }
  });

  return this;
};

// When the page loads, check the value in local storage and set the sidebar accordingly
$(document).ready(function () {
  window.addEventListener("resize", function () {
    var sidebarState = "localStorage" in window ? window.localStorage.getItem("sidebarState") : "shrinked";
    if (sidebarState === "shrinked" && window.innerWidth < 1200) {
      $(".side-navbar").addClass("shrinked");
      $(".sidebar").addClass("shrinked");
      $(".content-inner").addClass("active");
      $("#sidebar-overlay").removeClass("d-none");
    } else {
      $(".side-navbar").removeClass("shrinked");
      $(".sidebar").removeClass("shrinked");
      $(".content-inner").removeClass("active");
      if ($(".side-navbar").hasClass("collapsed")) {
        $(".side-navbar").toggleClass("collapsed");
        $("#nav-collapse").toggleClass("collapsed");
        $(".sidebar").toggleClass("collapsed");
        $(".hide-collpased").toggleClass("d-none");
      } else if ($("#toggle-btn").hasClass("active")) {
        $(".navbar-header .brand-small").hide();
        $(".navbar-header .brand-big").show();
      } else {
        $(".navbar-header .brand-small").show();
        $(".navbar-header .brand-big").hide();
      }
    }
  });
});
