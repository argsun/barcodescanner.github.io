


function getApiAddress(name) {
  var full = window.location.host;
  var parts = full.split(".");
  var sub = parts[0] != undefined ? parts[0] : "";
  var domain = parts[1] != undefined ? "." + parts[1] : "";
  var type = parts[2] != undefined ? "." + parts[2] : "";
  return ("http://" + "api" + domain + type + "/" + name);
//   return "http://api.chaparnet.local" + "/" + name;
}
function getSecondPart(str) {
  return str.split("@")[0];
}
//dynamic portal address base url
function getOrginAddress(name) {
  var full = window.location.host;
  var parts = full.split(".");
  var sub = parts[0] != undefined ? parts[0] : "";
  var domain = parts[1] != undefined ? "." + parts[1] : "";
  var type = parts[2] != undefined ? "." + parts[2] : "";
  return ("http://" + "portal" + domain + type + "/" + name);
//   return "http://portal.chaparnet.local" + "/" + name;
}
// intialize Mobile Scanner
var ScanCode=""
$(function() {
  var App = {
      init : function() {
          Quagga.init(this.state, function(err) {
              if (err) {
                  console.log(err);
                  return;
              }
              App.attachListeners();
              App.checkCapabilities();
              Quagga.start();
          });
      },
      checkCapabilities: function() {
          var track = Quagga.CameraAccess.getActiveTrack();
          var capabilities = {};
          if (typeof track.getCapabilities === 'function') {
              capabilities = track.getCapabilities();
          }
          this.applySettingsVisibility('zoom', capabilities.zoom);
          this.applySettingsVisibility('torch', capabilities.torch);
      },
      updateOptionsForMediaRange: function(node, range) {
          console.log('updateOptionsForMediaRange', node, range);
          var NUM_STEPS = 6;
          var stepSize = (range.max - range.min) / NUM_STEPS;
          var option;
          var value;
          while (node.firstChild) {
              node.removeChild(node.firstChild);
          }
          for (var i = 0; i <= NUM_STEPS; i++) {
              value = range.min + (stepSize * i);
              option = document.createElement('option');
              option.value = value;
              option.innerHTML = value;
              node.appendChild(option);
          }
      },
      applySettingsVisibility: function(setting, capability) {
          // depending on type of capability
          if (typeof capability === 'boolean') {
              var node = document.querySelector('input[name="settings_' + setting + '"]');
              if (node) {
                  node.parentNode.style.display = capability ? 'block' : 'none';
              }
              return;
          }
          if (window.MediaSettingsRange && capability instanceof window.MediaSettingsRange) {
              var node = document.querySelector('select[name="settings_' + setting + '"]');
              if (node) {
                  this.updateOptionsForMediaRange(node, capability);
                  node.parentNode.style.display = 'block';
              }
              return;
          }
      },
      initCameraSelection: function(){
          var streamLabel = Quagga.CameraAccess.getActiveStreamLabel();

          return Quagga.CameraAccess.enumerateVideoDevices()
          .then(function(devices) {
              function pruneText(text) {
                  return text.length > 30 ? text.substr(0, 30) : text;
              }
              var $deviceSelection = document.getElementById("deviceSelection");
              while ($deviceSelection.firstChild) {
                  $deviceSelection.removeChild($deviceSelection.firstChild);
              }
              devices.forEach(function(device) {
                  var $option = document.createElement("option");
                  $option.value = device.deviceId || device.id;
                  $option.appendChild(document.createTextNode(pruneText(device.label || device.deviceId || device.id)));
                  $option.selected = streamLabel === device.label;
                  $deviceSelection.appendChild($option);
              });
          });
      },
      attachListeners: function() {
          var self = this;
          self.initCameraSelection();
          $(".controls").on("click", "button.stop", function(e) {
              e.preventDefault();
              Quagga.stop();
          });

          $(".controls .reader-config-group").on("change", "input, select", function(e) {
              e.preventDefault();
              var $target = $(e.target),
                  value = $target.attr("type") === "checkbox" ? $target.prop("checked") : $target.val(),
                  name = $target.attr("name"),
                  state = self._convertNameToState(name);

              console.log("Value of "+ state + " changed to " + value);
              self.setState(state, value);
          });
      },
      _accessByPath: function(obj, path, val) {
          var parts = path.split('.'),
              depth = parts.length,
              setter = (typeof val !== "undefined") ? true : false;

          return parts.reduce(function(o, key, i) {
              if (setter && (i + 1) === depth) {
                  if (typeof o[key] === "object" && typeof val === "object") {
                      Object.assign(o[key], val);
                  } else {
                      o[key] = val;
                  }
              }
              return key in o ? o[key] : {};
          }, obj);
      },
      _convertNameToState: function(name) {
          return name.replace("_", ".").split("-").reduce(function(result, value) {
              return result + value.charAt(0).toUpperCase() + value.substring(1);
          });
      },
      detachListeners: function() {
          $(".controls").off("click", "button.stop");
          $(".controls .reader-config-group").off("change", "input, select");
      },
      applySetting: function(setting, value) {
          var track = Quagga.CameraAccess.getActiveTrack();
          if (track && typeof track.getCapabilities === 'function') {
              switch (setting) {
              case 'zoom':
                  return track.applyConstraints({advanced: [{zoom: parseFloat(value)}]});
              case 'torch':
                  return track.applyConstraints({advanced: [{torch: !!value}]});
              }
          }
      },
      setState: function(path, value) {
          var self = this;

          if (typeof self._accessByPath(self.inputMapper, path) === "function") {
              value = self._accessByPath(self.inputMapper, path)(value);
          }

          if (path.startsWith('settings.')) {
              var setting = path.substring(9);
              return self.applySetting(setting, value);
          }
          self._accessByPath(self.state, path, value);

          console.log(JSON.stringify(self.state));
          App.detachListeners();
          Quagga.stop();
          App.init();
      },
      inputMapper: {
          inputStream: {
              constraints: function(value){
                  if (/^(\d+)x(\d+)$/.test(value)) {
                      var values = value.split('x');
                      return {
                          width: {min: parseInt(values[0])},
                          height: {min: parseInt(values[1])}
                      };
                  }
                  return {
                      deviceId: value
                  };
              }
          },
          numOfWorkers: function(value) {
              return parseInt(value);
          },
          decoder: {
              readers: function(value) {
                  if (value === 'ean_extended') {
                      return [{
                          format: "ean_reader",
                          config: {
                              supplements: [
                                  'ean_5_reader', 'ean_2_reader'
                              ]
                          }
                      }];
                  }
                  return [{
                      format: value + "_reader",
                      config: {}
                  }];
              }
          }
      },
      state: {
          inputStream: {
              type : "LiveStream",
              constraints: {
                  width: {min: 640},
                  height: {min: 480},
                  aspectRatio: {min: 1, max: 100},
                  facingMode: "environment" // or user
              }
          },
          locator: {
              patchSize: "medium",
              halfSample: true
          },
          numOfWorkers: 2,
          frequency: 10,
          decoder: {
              readers : [{
                  format: "code_128_reader",
                  config: {}
              }]
          },
          locate: true
      },
      lastResult : null
  };

  App.init();

  Quagga.onProcessed(function(result) {
      var drawingCtx = Quagga.canvas.ctx.overlay,
          drawingCanvas = Quagga.canvas.dom.overlay;

      if (result) {
          if (result.boxes) {
              drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
              result.boxes.filter(function (box) {
                  return box !== result.box;
              }).forEach(function (box) {
                  Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {color: "green", lineWidth: 2});
              });
          }

          if (result.box) {
              Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {color: "#00F", lineWidth: 2});
          }

          if (result.codeResult && result.codeResult.code) {
              Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, drawingCtx, {color: 'red', lineWidth: 3});
          }
      }
  });

  Quagga.onDetected(function(result) {
      var code = result.codeResult.code;
if (code.length===17 && !isNaN(code)){
  ScanCode=code
      if (App.lastResult !== code) {
          App.lastResult = code;
          var $node = null, canvas = Quagga.canvas.dom.image;

          $node = $('<li><div class="thumbnail"><div class="imgWrapper"><img /></div><div class="caption"><h4 class="code"></h4></div></div></li>');
          $node.find("img").attr("src", canvas.toDataURL());
          $node.find("h4.code").html(code);
          $("#result_strip ul.thumbnails").prepend($node);
          var audio = new Audio("success.wav");
          audio.play();
          playSound("success.wav");
          
      }
   } });
});
var modal = document.getElementById("myModal");

var btn = document.getElementById("myBtn");


var span = document.getElementsByClassName("close")[0];


btn.onclick = function() {
  modal.style.display = "block";
}


span.onclick = function() {
  modal.style.display = "none";
}


window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}
// save links in vars
var fetchAgentApiAddress = getApiAddress("fetch_agent");
var fetchDriverApiAddress = getApiAddress("fetch_driver");
var fetchCityApiAddress = getApiAddress("get_city");
var orginApiAddress = getApiAddress("");
var orginAddress = getOrginAddress("");
var availableAgentTags = [];
var availableDeliverTags = [];
var expectedPackages = [];
var greenPackages = [];
var redPackages = [];
var Agent;
var Driver;
var Page = 0;

function playSound(url) {
  var a = new Audio(url);
  a.play();
}
toastr.options = {
  closeButton: false,
  debug: false,
  newestOnTop: true,
  progressBar: true,
  positionClass: "toast-top-full-width",
  preventDuplicates: false,
  onclick: null,
  showDuration: "6500",
  hideDuration: "6500",
  timeOut: "6500",
  extendedTimeOut: "6500",
  showEasing: "swing",
  hideEasing: "linear",
  showMethod: "fadeIn",
  hideMethod: "fadeOut"
};
//Func to add packages in boxes & arries
function addNewPackage(Type, PackageNum) {
  switch (Type) {
    case "Exp":
      expectedPackages.push("" + PackageNum + "");
      break;
    case "Cor":
      greenPackages.push("" + PackageNum + "");
      break;
    case "Err":
      redPackages.push("" + PackageNum + "");
      break;
  }
}

function changePage(Page) {
  switch (Page) {
    case "manifestPage":
      $("#packetInfoPage").removeClass("active");
      $("#manifestPage").addClass("active");
      $(".page1").removeClass("hide");
      $(".page2").addClass("hide");
      break;
    case "packetInfoPage":
      $("#packetInfoPage").addClass("active");
      $("#manifestPage").removeClass("active");
      $(".page1").addClass("hide");
      $(".page2").removeClass("hide");
      break;
  }
}
//Render all packages in boxsex ; when clicked on box
function renderPackages(Type) {
  $(".PackageNumsContainer").html("");
  $("#FirstMenu").text(expectedPackages.length);
  $("#SecondMenu").text(greenPackages.length);
  $("#ThirdMenu").text(redPackages.length);

  switch (Type) {
    case "Exp":
      $.each(expectedPackages, function(key, item) {
        $(".PackageNumsContainer").append("<li>" + item + "</li>");
      });
      $("#FirstMenu").addClass("selectedBtn");
      $("#SecondMenu").removeClass("selectedBtn");
      $("#ThirdMenu").removeClass("selectedBtn");
      break;
    case "Cor":
      $.each(greenPackages, function(key, item) {
        $(".PackageNumsContainer").append("<li>" + item + "</li>");
      });
      $("#SecondMenu").addClass("selectedBtn");
      $("#FirstMenu").removeClass("selectedBtn");
      $("#ThirdMenu").removeClass("selectedBtn");
      break;
    case "Err":
      $.each(redPackages, function(key, item) {
        $(".PackageNumsContainer").append("<li>" + item + "</li>");
      });
      $("#ThirdMenu").addClass("selectedBtn");
      $("#FirstMenu").removeClass("selectedBtn");
      $("#SecondMenu").removeClass("selectedBtn");
      break;
  }
}
$(document).ready(function() {
  $(document).on("click", "#manifestPage", function() {
    changePage("manifestPage");
    $("#PackageNumber").focus();
    $("#PackageNumber").select();
  });
  $(document).on("click", "#packetInfoPage", function() {
    changePage("packetInfoPage");
    $("#InfoPackageNumber").focus();
    $("#InfoPackageNumber").select();
  });
  

  $("#MainFormPacketInfo").submit(function(e) {
    e.preventDefault();
    var PackageNumber = $("#InfoPackageNumber").val();
    if(PackageNumber="" && ScanCode!=""){
      PackageNumber=ScanCode
    }


    $.ajax({
      method: "POST",
      url:
        orginApiAddress +
        "fetch_cn?input={" +
        '"' +
        "cn" +
        '"' +
        ": " +
        PackageNumber +
        "" +
        "," +
        '"' +
        "code" +
        '"' +
        ": 1001" +
        "}",
      dataType: "json",
      success: function(data) {
        if (data.result) {
          var packetData = data.objects.cons[0];
          $(".page2 .info-conatiner .row .consignment-num span").text(
            packetData.ConsignmentNo
          );
          $(".page2 .info-conatiner .row .pickup-date span").text(
            packetData.PickupDate
          );
          $(".page2 .info-conatiner .row .from-city span").text(
            packetData.CityFrom
          );
          $(".page2 .info-conatiner .row .to-city span").text(
            packetData.CityTo
          );
          $(".page2 .info-conatiner .row .packet-status span").text(
            packetData.Status
          );
          if (packetData.TermsOfPayment == 0) {
            $(".page2 .info-conatiner .row .terms-of-payment span").text(
              "پیش کرایه"
            );
          } else {
            $(".page2 .info-conatiner .row .terms-of-payment span").text(
              "پس کرایه"
            );
          }
          $(".page2 .info-conatiner .row .weight span").text(packetData.Weight);
          $(".page2 .info-conatiner .row .content span").text(
            packetData.Content
          );
          $(".page2 .info-conatiner .row .sum-price span").text(
            packetData.Total
          );
          $(".page2 .info-conatiner .row .sender-name span").text(
            packetData.Sender.FullName
          );
          $(".page2 .info-conatiner .row .sender-addr span").text(
            packetData.Sender.Address
          );
          $(".page2 .info-conatiner .row .sender-phone span").text(
            packetData.Sender.Phone
          );
          $(".page2 .info-conatiner .row .sender-mobile span").text(
            packetData.Sender.Mobile
          );

          $(".page2 .info-conatiner .row .receiver-name span").text(
            packetData.Receiver.FullName
          );
          $(".page2 .info-conatiner .row .receiver-addr span").text(
            packetData.Receiver.Address
          );
          $(".page2 .info-conatiner .row .receiver-phone span").text(
            packetData.Receiver.Phone
          );
          $(".page2 .info-conatiner .row .receiver-mobile span").text(
            packetData.Receiver.Mobile
          );
          $("#InfoPackageNumber").focus();
          $("#InfoPackageNumber").select();
        } else {
          toastr.error(data.message);
          $(".page2 .info-conatiner .row .consignment-num span").text("");
          $(".page2 .info-conatiner .row .pickup-date span").text("");
          $(".page2 .info-conatiner .row .from-city span").text("");
          $(".page2 .info-conatiner .row .to-city span").text("");
          $(".page2 .info-conatiner .row .packet-status span").text("");
          $(".page2 .info-conatiner .row .terms-of-payment span").text("");
          $(".page2 .info-conatiner .row .weight span").text("");
          $(".page2 .info-conatiner .row .content span").text("");
          $(".page2 .info-conatiner .row .sum-price span").text("");
          $(".page2 .info-conatiner .row .sender-name span").text("");
          $(".page2 .info-conatiner .row .sender-addr span").text("");
          $(".page2 .info-conatiner .row .sender-phone span").text("");
          $(".page2 .info-conatiner .row .sender-mobile span").text("");
          $(".page2 .info-conatiner .row .receiver-name span").text("");
          $(".page2 .info-conatiner .row .receiver-addr span").text("");
          $(".page2 .info-conatiner .row .receiver-phone span").text("");
          $(".page2 .info-conatiner .row .receiver-mobile span").text("");
          $("#InfoPackageNumber").focus();
          $("#InfoPackageNumber").select();
        }
      },
      error: function(data) {}
    });
  });
  // $('#packetInfoPage').addClass('active');
  // $('#manifestPage').removeClass('active');
  // $('.page1').addClass('hide');
  // $('.page2').removeClass('hide');
  //Gereftan Status Haye Mojod va add kardan be combo box
  var ajx1 = $.ajax({
    method: "GET",
    url: orginApiAddress + "status_list?input={" + '"' + "group" + '"' + ":1}",
    dataType: "json",
    success: function(data) {
      $.each(data["objects"]["status"], function(key, value) {
        $("#Status").append(
          "<option value=" +
            '"' +
            value["id"] +
            '"' +
            ">" +
            value["persian_short"] +
            "</option>"
        );
      });
    },
    error: function(data) {}
  });
  //Gereftan List Namayande ha
  var ajx2 = $.ajax({
    method: "GET",
    url: fetchAgentApiAddress,
    crossDomain: true,
    dataType: "json",
    success: function(data) {
      $.each(data["objects"]["user"], function(key, value) {
        if (value["user_name"].substring(0, 1) == "D") {
        } else {
          availableAgentTags.push({
            label: value["full_name"],
            id: value["user_no"]
          });
        }
      });
    },
    error: function(data) {}
  });
  //Gereftan List Ranande ha
  var ajx3 = $.ajax({
    method: "GET",
    url: fetchDriverApiAddress,
    crossDomain: true,
    dataType: "json",
    success: function(data) {
      $.each(data["objects"]["user"], function(key, value) {
        if (value["user_name"].substring(0, 1) == "D") {
          availableDeliverTags.push({
            label: value["full_name"],
            id: value["user_no"]
          });
        } else {
        }
      });
      //console.log(availableDeliverTags);
    },
    error: function(data) {}
  });
  //Vaghti hame ajx ha tamom she loader kenar mire
  //Vali loader kolan nemiad chon handhela hang mikardan
  $.when(ajx1, ajx2, ajx3).done(function() {
    $("#loader").fadeOut();
    $("section").removeClass("hide");
  });
  //Suggest box bara Namayandeha
  $("#Agent").autocomplete({
    position: {
      my: "center top",
      at: "center bottom"
    },
    source: availableAgentTags,
    minLength: 2,
    //vaghti namayande ei enteghab mishe bagahal datash load mishe to expected packages
    select: function(event, ui) {
      expectedPackages = [];
      greenPackages = [];
      redPackages = [];
      if ($("#Status").val() == 0) {
        alert("عملیات مورد نظرتان را انتخاب کنید !");
      } else {
        Agent = ui.item.id;
        $.ajax({
          method: "GET",
          //link api gereftan baghal data
          url:
            orginApiAddress +
            "load_expected_data?input={" +
            '"' +
            "agent" +
            '"' +
            ":" +
            Agent +
            "," +
            '"' +
            "status" +
            '"' +
            ":" +
            '"' +
            $("#Status").val() +
            '"' +
            "}",
          dataType: "json",
          success: function(data) {
            $.each(data["objects"]["cn"], function(key, value) {
              expectedPackages.push(value);
            });
            renderPackages("Exp");
          },
          error: function(data) {}
        });
      }
    }
  });
  //suggest box Driver
  $("#Driver").autocomplete({
    source: availableDeliverTags,
    minLength: 2,
    select: function(event, ui) {
      if (Agent == "") {
        alert("ابتدا نماینده را مشخص کنید !");
        $(this).val("");
      } else {
        Driver = ui.item.id;
      }
    }
  });
  //Render kardan nesbat be boxi ke entekha mikonan
  $("#FirstMenu").click(function() {
    renderPackages("Exp");
    $(this).addClass("selectedBtn");
    $("#SecondMenu").removeClass("selectedBtn");
    $("#ThirdMenu").removeClass("selectedBtn");
  });
  $("#SecondMenu").click(function() {
    renderPackages("Cor");
    $(this).addClass("selectedBtn");
    $("#FirstMenu").removeClass("selectedBtn");
    $("#ThirdMenu").removeClass("selectedBtn");
  });
  $("#ThirdMenu").click(function() {
    renderPackages("Err");
    $(this).addClass("selectedBtn");
    $("#FirstMenu").removeClass("selectedBtn");
    $("#SecondMenu").removeClass("selectedBtn");
  });
  //submit form
  $("#MainForm").submit(function(e) {
    e.preventDefault();
    var PackageNumber = $("#PackageNumber").val();
    if (PackageNumber == "") {
      alert("مقداری وارد کنین !");
    } else {
      if ($("#Status").val() == "179") {
        $.post(
          orginApiAddress +
            'fetch_sorting?input={"cn":"' +
            PackageNumber +
            '"}',
          function(data) {
            if (data.result) {
              toastr.success(data.objects.agent);
            } else {
              toastr.warning(data.message);
            }
          }
        );
      }
      $.ajax({
        method: "GET",
        //check shodan shoamre baste va status va gereftan pasokh
        url:
          orginApiAddress +
          "check_cn?input={" +
          '"' +
          "cn" +
          '"' +
          ":" +
          '"' +
          PackageNumber +
          '"' +
          "," +
          '"' +
          "agent" +
          '"' +
          ":" +
          '"' +
          Agent +
          '"' +
          "," +
          '"' +
          "current_user" +
          '"' +
          ":" +
          '"' +
          current_user +
          '"' +
          "," +
          '"' +
          "status" +
          '"' +
          ":" +
          '"' +
          $("#Status").val() +
          '"' +
          "}",
        dataType: "json",
        success: function(data) {
          if (data.result) {
            var index = expectedPackages.indexOf(PackageNumber);
            if (index !== -1) {
              expectedPackages.splice(index, 1);
            }
            var index2 = greenPackages.indexOf(PackageNumber);
            if (index2 == -1) {
              greenPackages.push(PackageNumber);
              playSound(orginAddress + "Images/success.wav");
            } else {
              toastr.warning("این بسته را ثبت کرده اید !");
            }
          } else {
            var index = expectedPackages.indexOf(PackageNumber);
            if (index !== -1) {
              expectedPackages.splice(index, 1);
            }
            redPackages.push(PackageNumber);
            playSound(orginAddress + "Images/error.wav");
            toastr.warning(data.message);
          }

          renderPackages("Cor");

          renderPackages("Err");

          renderPackages("Exp");
        },
        error: function(data) {}
      });
    }
    $("#PackageNumber").val("");
    $("#PackageNumber").blur();
    $("#PackageNumber").select();
    // $.ajax({
    //        type: "POST",
    //        url: url,
    //        data: $("#idForm").serialize(), // serializes the form's elements.
    //        success: function(data)
    //        {
    //            alert(data); // show response from the php script.
    //        }
    //      });
    e.preventDefault(); // avoid to execute the actual submit of the form.
  });
  // playSound("http://portal.parschapar.local/Images/success.wav");
  // playSound("http://portal.parschapar.local/Images/error.wav");
  //Sabt Nahayii baste haye taeid shode
  $("#submit2").click(function() {
    $.confirm({
      title: "تایید مانیفست",
      content: "آیا از تایید مانیفست مطمئن هستید ؟",
      buttons: {
        confirm: {
          text: "تایید مانیفست", // text for button
          btnClass: "btn-blue", // class for the button
          isHidden: false, // initially not hidden
          isDisabled: false, // initially not disabled
          action: function(confirm) {
            $(".jconfirm-buttons .btn-blue").prop("disabled", 1);
            if (Agent != "" || Driver != "") {
              var canPass = true;
              //object mored ghabool api
              var obj = {
                order: {
                  consignment_no: [],
                  status: "",
                  agent_no: "",
                  current_user: "",
                  driver: ""
                }
              };
              var uniqueGreenPackages = [];
              $.each(greenPackages, function(i, el) {
                if ($.inArray(el, uniqueGreenPackages) === -1)
                  uniqueGreenPackages.push(el);
              });
              obj.order.consignment_no = uniqueGreenPackages;
              if (uniqueGreenPackages.length == 0) {
                alert("بسته ای وارد نکردید !");
                canPass = false;
              }
              obj.order.status = $("#Status").val();
              obj.order.agent_no = Agent;
              obj.order.driver = Driver;
              obj.order.current_user = current_user;
              obj.order.time = current_time;
              var $json = JSON.stringify(obj);
              if (canPass) {
                this.buttons.confirm.disable();
                $.ajax({
                  method: "POST",
                  url: orginApiAddress + "update_status_multi",
                  dataType: "json",
                  data: {
                    input: $json
                  },
                  success: function(data) {
                    if (data.result) {
                      toastr.success("با موفقیت ذخیره شد");
                      setTimeout(function() {
                        document.location.reload();
                      }, 3000);
                    } else {
                      var errorPackages = [];
                      data.objects.error.map(item => {
                        errorPackages.push(getSecondPart(item));
                      });
                      toastr.error(data.message);
                      $(".jconfirm-buttons .btn-blue").prop("disabled", 0);
                      $.confirm({
                        title: "تایید مانیفست",
                        content:
                          "<div class='error-list'>" +
                          data.objects.error.join("<br/>") +
                          "</div>" +
                          "<br/>" +
                          "این بسته ها ثبت نمیشوند آیا مایل به ثبت بقیه بسته ها هستید؟",
                        buttons: {
                          confirm: {
                            text: "تایید و ثبت", // text for button
                            btnClass: "btn-blue", // class for the button
                            isHidden: false, // initially not hidden
                            isDisabled: false, // initially not disabled
                            action: function(confirm) {
                              $(".jconfirm-buttons .btn-blue").prop(
                                "disabled",
                                1
                              );
                              if (Agent != "" || Driver != "") {
                                var canPass = true;
                                //object mored ghabool api
                                var obj = {
                                  order: {
                                    consignment_no: [],
                                    status: "",
                                    agent_no: "",
                                    current_user: "",
                                    driver: ""
                                  }
                                };
                                var uniqueGreenPackages = [];
                                $.each(greenPackages, function(i, el) {
                                  if ($.inArray(el, uniqueGreenPackages) === -1)
                                    uniqueGreenPackages.push(el);
                                });
                                uniqueGreenPackages=uniqueGreenPackages.reduce(function(
                                  prev,
                                  value
                                ) {
                                  var isDuplicate = false;
                                  for (
                                    var i = 0;
                                    i < errorPackages.length;
                                    i++
                                  ) {
                                    if (value == errorPackages[i]) {
                                      isDuplicate = true;
                                      break;
                                    }
                                  }

                                  if (!isDuplicate) {
                                    prev.push(value);
                                  }

                                  return prev;
                                },
                                []);
                                console.log('up',uniqueGreenPackages);
                                console.log('er',errorPackages);
                                obj.order.consignment_no = uniqueGreenPackages;
                                if (uniqueGreenPackages.length == 0) {
                                  alert("بسته ای وارد نکردید !");
                                  canPass = false;
                                }
                                obj.order.status = $("#Status").val();
                                obj.order.agent_no = Agent;
                                obj.order.driver = Driver;
                                obj.order.current_user = current_user;
                                obj.order.time = current_time;

                                var $json = JSON.stringify(obj);
                                if (canPass) {
                                  this.buttons.confirm.disable();
                                  $.ajax({
                                    method: "POST",
                                    url:
                                      orginApiAddress + "update_status_multi",
                                    dataType: "json",
                                    data: {
                                      input: $json
                                    },
                                    success: function(data) {
                                      if (data.result) {
                                        toastr.success("با موفقیت ذخیره شد");
                                        setTimeout(function() {
                                          document.location.reload();
                                        }, 3000);
                                      } else {
                                        toastr.error(data.message);
                                        alert(data.objects.error.join("\n"));
                                        $(".jconfirm-buttons .btn-blue").prop(
                                          "disabled",
                                          0
                                        );
                                      }
                                    },
                                    error: function(data) {
                                      alert("مشکلی وجود دارد !");
                                      $(".jconfirm-buttons .btn-blue").prop(
                                        "disabled",
                                        0
                                      );
                                    }
                                  });
                                }
                              } else {
                                alert("نماینده یا راننده را مشخص نکردین !");
                                $(".jconfirm-buttons .btn-blue").prop(
                                  "disabled",
                                  0
                                );
                              }
                            }
                          },
                          cancel: {
                            text: " انصراف و عدم ارسال", // text for button
                            btnClass: "btn-red", // class for the button
                            isHidden: false, // initially not hidden
                            isDisabled: false, // initially not disabled
                            action: function(cancel) {
                              // playSound("http://portal.parschapar.local/Images/error.wav");
                            }
                          }
                        }
                      });
                    }
                  },
                  error: function(data) {
                    alert("مشکلی وجود دارد !");
                    $(".jconfirm-buttons .btn-blue").prop("disabled", 0);
                  }
                });
              }
            } else {
              alert("نماینده یا راننده را مشخص نکردین !");
              $(".jconfirm-buttons .btn-blue").prop("disabled", 0);
            }
          }
        },
        cancel: {
          text: " انصراف", // text for button
          btnClass: "btn-red", // class for the button
          isHidden: false, // initially not hidden
          isDisabled: false, // initially not disabled
          action: function(cancel) {
            // playSound("http://portal.parschapar.local/Images/error.wav");
          }
        }
      }
    });
  });
});
