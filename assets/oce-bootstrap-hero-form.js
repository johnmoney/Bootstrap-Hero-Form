/* oce-bootstrap-hero-form.js v1.0 */
(function () {
  console.log('%c O ', 'background:firebrick;color:white;', 'CX Content Bootstrap Hero Form - v1.0');

  //loader with Promise based on https://stackoverflow.com/a/46961218
  loader = function(src) {
    //initialize queue
    if( loader.items === undefined ) {
        loader.items = [];
        loader.index = -1;
        loader.loading = false;
        loader.next = function() {
            if( loader.loading ) return;

            //load the next queue item
            loader.loading = true;
            var item = loader.items[++loader.index];
            var head = document.getElementsByTagName('head')[0];

            //detect type
            if (item.src.slice(-2) == 'js') {
              var child = document.createElement('script');
              child.type = 'text/javascript';
              child.src = item.src;
            }
            else {
              var child = document.createElement('link');
              child.type = 'text/css';
              child.href = item.src;
              child.rel = 'stylesheet';
            }

            //when complete, start next item in queue and resolve this item's promise
            child.onload = () => {
                loader.loading = false;
                if( loader.index < loader.items.length - 1 ) loader.next();
                item.resolve();
            };
            head.appendChild(child);
        };
    };

    //adding to queue
    if( src ) {
        //check if already added
        for(var i=0; i < loader.items.length; i++) {
            if( loader.items[i].src == src ) return loader.items[i].promise;
        }
        //add to the queue
        var item = { src: src };
        item.promise = new Promise(resolve => {item.resolve = resolve;});
        loader.items.push(item);
        loader.next();
    }

    //return the promise of the last queue item
    return loader.items[ loader.items.length - 1 ].promise;
  };

  //add required UX scripts and stylesheets
  [
    "https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css",
    "https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css",
    "oce-bootstrap-form.css",
    "oce-bootstrap-hero-form.css",
    "https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js",
    "https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js",
  ].forEach(loader);
  
  //load promise scripts
  loader("/documents/static/gemini/api/content-form-sdk-1.0.js")
  .then(function() {
    loader("https://cdn.jsdelivr.net/npm/autosize@4.0.2/dist/autosize.min.js")
    .then(function() {
      loader("https://cdnjs.cloudflare.com/ajax/libs/jquery.inputmask/5.0.5/inputmask.min.js")
      .then(function() {
        contentFormSDK.init(initForm);
      });
    });
  });

  //content sdk
  var item, isSlugEnabled;

  // validates form
  function validateForm() {
    var isValid = true;
    var message = '';
    if (!item.get().name) {
      isValid = false;
      message = 'Headline is required.'
    }
    if (isSlugEnabled) {
      if (!item.get().slug) {
        isValid = false;
        message = 'Friendly item name for URL is required.'
      }
    }
    if (item.isNew()) {
      if (!item.get().language) {
        isValid = false;
        message = 'Language is required.'
      }
    }
    return {
      isValid: isValid,
      message: message
    }
  }

  function initForm(sdk) {
    // type
    var type = sdk.getType();

    // item being rendered in the form
    item = sdk.getItem();

    // current locale of the UI
    var locale = sdk.getLocale();

    // fields of the item
    var fields = item.getFields();

    //item properties
    var itemProps = item.get();

    // repository's  default language
    var defaultLang = sdk.getRepositoryDefaultLanguage();

    // validation call back registeration
    sdk.registerFormValidation(validateForm);

    var slug = type.getSlug();
    isSlugEnabled = slug.enabled;
    var isSlashAllowed = slug['allow-forward-slash'] ? slug['allow-forward-slash'] : false;

    item.on('update', function (props) {
      //sync up item properties when item is updated
      itemProps = props;
    });

    // display language drop down and non translate checkbox for new items
    var languagePlaceholder = document.getElementById('languagePlaceholder');
    if (item.isNew()) {
      var isMaster = itemProps.languageIsMaster;

      // language dropdown
      var langOptions = item.getLanguageOptions();
      var select = '<select class="form-control" id="language" required>';
      if (langOptions && langOptions.length > 0) {
        select += '<option value="" disabled selected>Select a language</option>';
        langOptions.forEach(function (option) {
          var selected = (isMaster && option.value === defaultLang) ? 'selected' : '';
          select += '<option value="' + option.value + '" ' + selected + '>' + option.label + '</option>';
        });
      }
      select += '</select>';
      languagePlaceholder.innerHTML = select;

      if (langOptions && langOptions.length > 0) {
        // for master set the default repo language selected.
        var language = document.getElementById('language');
        if (isMaster && language.value) {
          item.setLanguage(language.value, {silent: true});
        }

        language.addEventListener('change', function (e) {
          item.setLanguage(language.value);
        });
      }

      //show non-translatbale checkbox only for master
      if (isMaster) {
        var nonTranslatableGroup = document.getElementById('system-nonTranslatable');
        nonTranslatableGroup.classList.remove('d-none');

        var nonTranslatableCheckbox = document.getElementById('nonTranslatableCheckbox');
        nonTranslatableCheckbox.addEventListener('change', function (e) {
          item.setTranslatable(!nonTranslatableCheckbox.checked == true);
        });
      }
    }
    // show language
    else {
      languagePlaceholder.innerHTML = itemProps.language;
    }

    // display friendly url field if it is enabled in type
    if (isSlugEnabled) {
      var slugGroup = document.getElementById('system-slug');
      slugGroup.classList.remove('d-none');

      //slug value
      var slug = document.getElementById('slug');
      slug.value = itemProps.slug ? itemProps.slug : '';

      //add input mask
      var im;
      if (isSlashAllowed) im = new Inputmask({ regex: "[0-9a-zA-Z][0-9a-zA-Z\-_\./]+", placeholder: "" });
        else im = new Inputmask({ regex: "[0-9a-zA-Z][0-9a-zA-Z\-_\.]+", placeholder: "" });
      im.mask(slug);

      slug.addEventListener('change', function (e) {
        item.validateSlug(slug.value).then(function (validation) {
          if (validation && validation.isValid) {
            item.setSlug(slug.value);
          }
          else {
            console.error('Invalid slug');
          }
        }).catch(function (error) {
          // handle error
          console.error('Error while invoking item.validateSlug:', error);
        });
      });
    }

    // rendering of fields can follow
    fields.forEach(function(field){
      var fieldDefn = field.getDefinition(),
        fieldName = fieldDefn.name,
        dataType = fieldDefn.datatype;

      if (fieldName === 'headline'){
        var headline = document.getElementById('headline');
        headline.value = field.getValue() ? field.getValue() : '';
        autosize(headline);
        autosize.update(headline);
        headline.addEventListener('change', function(e) {
          field.setValue(headline.value);
          //silently set name
          if (headline.value != '') {
            //replace characters with dash
            var cleanName = headline.value.replace(/;|:|\/|\\|\|/gi, "-"); // \|*
            //remove characters
            cleanName = cleanName.replace(/"|\?|<|>|%|{|}|\*/gi, "");
            //slice to max length and trim
            cleanName = cleanName.slice(0,64).trim();
            //set name
            item.setName(cleanName);
          }
        });
      }

      if (fieldName === 'subheadline'){
        var subheadline = document.getElementById('subheadline');
        subheadline.value = field.getValue() ? field.getValue() : '';
        autosize(subheadline);
        autosize.update(subheadline);
        subheadline.addEventListener('change', function(e) {
          field.setValue(subheadline.value);
        });
      }

      if (fieldName === 'cta'){
        var cta = document.getElementById('cta');
        cta.value = field.getValue() ? field.getValue() : '';
        cta.addEventListener('change', function(e) {
          field.setValue(cta.value);
        });
      }

      if (fieldName === 'ctaLink'){
        var ctaLink = document.getElementById('ctaLink');
        ctaLink.value = field.getValue() ? field.getValue() : '';
        ctaLink.addEventListener('change', function(e) {
          field.setValue(ctaLink.value);
        });

        //show on hover
        var group = document.getElementById('ctaGroup');
        group.addEventListener('mouseenter', function(e) {
          var fieldInput = document.getElementById('ctaLink');
          fieldInput.classList.remove('d-none');
        });
        group.addEventListener('mouseleave', function(e) {
          var fieldInput = document.getElementById('ctaLink');
          fieldInput.classList.add('d-none');
        });
      }

      if (fieldName === 'background'){
        if (field.getValue()) {
          var jumbotron = document.getElementById('hero');
          var image = '/content/management/api/v1.1/assets/' + field.getValue().id + '/Medium?format=jpg&type=responsiveimage'
          jumbotron.style.backgroundImage = 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url("' + image + '")';
        }

        var assetPicker = document.getElementById('oce-assetPicker');
        assetPicker.addEventListener('click', function(e) {
          field.openAssetPicker().then(function (data) {
            var newValue = { id: data.id, type: data.type, name: data.name };
            var jumbotron = document.getElementById('hero');
            var image = '/content/management/api/v1.1/assets/' + data.id + '/Medium?format=jpg&type=responsiveimage'
            jumbotron.style.backgroundImage = 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url("' + image + '")';
            field.setValue(newValue);
          }).catch(function (error) {
            // handle error
          });
        });
      }

      //initialize bootstrap tooltips
      var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-toggle="tooltip"]'));
      var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
      });

      //show the hero
      var fieldInput = document.getElementById('form-wrapper');
      fieldInput.style.visibility = "visible";

    });
  }
})();