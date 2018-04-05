( function( $ ) {

	'use strict';

	if ( typeof wpcf7 === 'undefined' || wpcf7 === null ) {
		return;
	}

	wpcf7 = $.extend( {
		cached: 0,
		inputs: []
	}, wpcf7 );

	$( function() {
		wpcf7.supportHtml5 = ( function() {
			var features = {};
			var input = document.createElement( 'input' );

			features.placeholder = 'placeholder' in input;

			var inputTypes = [ 'email', 'url', 'tel', 'number', 'range', 'date' ];

			$.each( inputTypes, function( index, value ) {
				input.setAttribute( 'type', value );
				features[ value ] = input.type !== 'text';
			} );

			return features;
		} )();

		$( 'div.wpcf7 > form' ).each( function() {
			var $form = $( this );
			wpcf7.initForm( $form );

			if ( wpcf7.cached ) {
				wpcf7.refill( $form );
			}
		} );
	} );

	wpcf7.getId = function( form ) {
		return parseInt( $( 'input[name="_wpcf7"]', form ).val(), 10 );
	};

	wpcf7.initForm = function( form ) {
		var $form = $( form );

		$form.submit( function( event ) {
			if ( typeof window.FormData !== 'function' ) {
				return;
			}

			wpcf7.submit( $form );
			event.preventDefault();
		} );

		$( '.wpcf7-submit', $form ).after( '<span class="ajax-loader"></span>' );

		wpcf7.toggleSubmit( $form );

		$form.on( 'click', '.wpcf7-acceptance', function() {
			wpcf7.toggleSubmit( $form );
		} );

		// Exclusive Checkbox
		$( '.wpcf7-exclusive-checkbox', $form ).on( 'click', 'input:checkbox', function() {
			var name = $( this ).attr( 'name' );
			$form.find( 'input:checkbox[name="' + name + '"]' ).not( this ).prop( 'checked', false );
		} );

		// Free Text Option for Checkboxes and Radio Buttons
		$( '.wpcf7-list-item.has-free-text', $form ).each( function() {
			var $freetext = $( ':input.wpcf7-free-text', this );
			var $wrap = $( this ).closest( '.wpcf7-form-control' );

			if ( $( ':checkbox, :radio', this ).is( ':checked' ) ) {
				$freetext.prop( 'disabled', false );
			} else {
				$freetext.prop( 'disabled', true );
			}

			$wrap.on( 'change', ':checkbox, :radio', function() {
				var $cb = $( '.has-free-text', $wrap ).find( ':checkbox, :radio' );

				if ( $cb.is( ':checked' ) ) {
					$freetext.prop( 'disabled', false ).focus();
				} else {
					$freetext.prop( 'disabled', true );
				}
			} );
		} );

		// Placeholder Fallback
		if ( ! wpcf7.supportHtml5.placeholder ) {
			$( '[placeholder]', $form ).each( function() {
				$( this ).val( $( this ).attr( 'placeholder' ) );
				$( this ).addClass( 'placeheld' );

				$( this ).focus( function() {
					if ( $( this ).hasClass( 'placeheld' ) ) {
						$( this ).val( '' ).removeClass( 'placeheld' );
					}
				} );

				$( this ).blur( function() {
					if ( '' === $( this ).val() ) {
						$( this ).val( $( this ).attr( 'placeholder' ) );
						$( this ).addClass( 'placeheld' );
					}
				} );
			} );
		}

		if ( wpcf7.jqueryUi && ! wpcf7.supportHtml5.date ) {
			$form.find( 'input.wpcf7-date[type="date"]' ).each( function() {
				$( this ).datepicker( {
					dateFormat: 'yy-mm-dd',
					minDate: new Date( $( this ).attr( 'min' ) ),
					maxDate: new Date( $( this ).attr( 'max' ) )
				} );
			} );
		}

		if ( wpcf7.jqueryUi && ! wpcf7.supportHtml5.number ) {
			$form.find( 'input.wpcf7-number[type="number"]' ).each( function() {
				$( this ).spinner( {
					min: $( this ).attr( 'min' ),
					max: $( this ).attr( 'max' ),
					step: $( this ).attr( 'step' )
				} );
			} );
		}

		// Character Count
		$( '.wpcf7-character-count', $form ).each( function() {
			var $count = $( this );
			var name = $count.attr( 'data-target-name' );
			var down = $count.hasClass( 'down' );
			var starting = parseInt( $count.attr( 'data-starting-value' ), 10 );
			var maximum = parseInt( $count.attr( 'data-maximum-value' ), 10 );
			var minimum = parseInt( $count.attr( 'data-minimum-value' ), 10 );

			var updateCount = function( target ) {
				var $target = $( target );
				var length = $target.val().length;
				var count = down ? starting - length : length;
				$count.attr( 'data-current-value', count );
				$count.text( count );

				if ( maximum && maximum < length ) {
					$count.addClass( 'too-long' );
				} else {
					$count.removeClass( 'too-long' );
				}

				if ( minimum && length < minimum ) {
					$count.addClass( 'too-short' );
				} else {
					$count.removeClass( 'too-short' );
				}
			};

			$( ':input[name="' + name + '"]', $form ).each( function() {
				updateCount( this );

				$( this ).keyup( function() {
					updateCount( this );
				} );
			} );
		} );

		// URL Input Correction
		$form.on( 'change', '.wpcf7-validates-as-url', function() {
			var val = $.trim( $( this ).val() );

			if ( val
			&& ! val.match( /^[a-z][a-z0-9.+-]*:/i )
			&& -1 !== val.indexOf( '.' ) ) {
				val = val.replace( /^\/+/, '' );
				val = 'http://' + val;
			}

			$( this ).val( val );
		} );
	};

	wpcf7.submit = function( form ) {
		if ( typeof window.FormData !== 'function' ) {
			return;
		}

		var $form = $( form );

		$( '.ajax-loader', $form ).addClass( 'is-active' );

		$( '[placeholder].placeheld', $form ).each( function( i, n ) {
			$( n ).val( '' );
		} );

		wpcf7.clearResponse( $form );

		var formData = new FormData( $form.get( 0 ) );

		var detail = {
			id: $form.closest( 'div.wpcf7' ).attr( 'id' ),
			status: 'init',
			inputs: [],
			formData: formData
		};

		$.each( $form.serializeArray(), function( i, field ) {
			if ( '_wpcf7' == field.name ) {
				detail.contactFormId = field.value;
			} else if ( '_wpcf7_version' == field.name ) {
				detail.pluginVersion = field.value;
			} else if ( '_wpcf7_locale' == field.name ) {
				detail.contactFormLocale = field.value;
			} else if ( '_wpcf7_unit_tag' == field.name ) {
				detail.unitTag = field.value;
			} else if ( '_wpcf7_container_post' == field.name ) {
				detail.containerPostId = field.value;
			} else if ( field.name.match( /^_wpcf7_\w+_free_text_/ ) ) {
				var owner = field.name.replace( /^_wpcf7_\w+_free_text_/, '' );
				detail.inputs.push( {
					name: owner + '-free-text',
					value: field.value
				} );
			} else if ( field.name.match( /^_/ ) ) {
				// do nothing
			} else {
				detail.inputs.push( field );
			}
		} );

		wpcf7.triggerEvent( $form.closest( 'div.wpcf7' ), 'beforesubmit', detail );

		var ajaxSuccess = function( data, status, xhr, $form ) {
			detail.id = $( data.into ).attr( 'id' );
			detail.status = data.status;

			var $message = $( '.wpcf7-response-output', $form );

			switch ( data.status ) {
				case 'validation_failed':
					$.each( data.invalidFields, function( i, n ) {
						$( n.into, $form ).each( function() {
							wpcf7.notValidTip( this, n.message );
							$( '.wpcf7-form-control', this ).addClass( 'wpcf7-not-valid' );
							$( '[aria-invalid]', this ).attr( 'aria-invalid', 'true' );
						} );
					} );

					$message.addClass( 'wpcf7-validation-errors' );
					$form.addClass( 'invalid' );

					wpcf7.triggerEvent( data.into, 'invalid', detail );
					break;
				case 'spam':
					$message.addClass( 'wpcf7-spam-blocked' );
					$form.addClass( 'spam' );

					$( '[name="g-recaptcha-response"]', $form ).each( function() {
						if ( '' === $( this ).val() ) {
							var $recaptcha = $( this ).closest( '.wpcf7-form-control-wrap' );
							wpcf7.notValidTip( $recaptcha, wpcf7.recaptcha.messages.empty );
						}
					} );

					wpcf7.triggerEvent( data.into, 'spam', detail );
					break;
				case 'mail_sent':
					$message.addClass( 'wpcf7-mail-sent-ok' );
					$form.addClass( 'sent' );

					if ( data.onSentOk ) {
						$.each( data.onSentOk, function( i, n ) { eval( n ) } );
					}

					wpcf7.triggerEvent( data.into, 'mailsent', detail );
					break;
				case 'mail_failed':
				case 'acceptance_missing':
				default:
					$message.addClass( 'wpcf7-mail-sent-ng' );
					$form.addClass( 'failed' );

					wpcf7.triggerEvent( data.into, 'mailfailed', detail );
			}

			wpcf7.refill( $form, data );

			if ( data.onSubmit ) {
				$.each( data.onSubmit, function( i, n ) { eval( n ) } );
			}

			wpcf7.triggerEvent( data.into, 'submit', detail );

			if ( 'mail_sent' == data.status ) {
				$form.each( function() {
					this.reset();
				} );
			}

			$form.find( '[placeholder].placeheld' ).each( function( i, n ) {
				$( n ).val( $( n ).attr( 'placeholder' ) );
			} );

			$message.html( '' ).append( data.message ).slideDown( 'fast' );
			$message.attr( 'role', 'alert' );

			$( '.screen-reader-response', $form.closest( '.wpcf7' ) ).each( function() {
				var $response = $( this );
				$response.html( '' ).attr( 'role', '' ).append( data.message );

				if ( data.invalidFields ) {
					var $invalids = $( '<ul></ul>' );

					$.each( data.invalidFields, function( i, n ) {
						if ( n.idref ) {
							var $li = $( '<li></li>' ).append( $( '<a></a>' ).attr( 'href', '#' + n.idref ).append( n.message ) );
						} else {
							var $li = $( '<li></li>' ).append( n.message );
						}

						$invalids.append( $li );
					} );

					$response.append( $invalids );
				}

				$response.attr( 'role', 'alert' ).focus();
			} );
		};

		$.ajax( {
			type: 'POST',
			url: wpcf7.apiSettings.getRoute(
				'/contact-forms/' + wpcf7.getId( $form ) + '/feedback' ),
			data: formData,
			dataType: 'json',
			processData: false,
			contentType: false
		} ).done( function( data, status, xhr ) {
			ajaxSuccess( data, status, xhr, $form );
			$( '.ajax-loader', $form ).removeClass( 'is-active' );
		} ).fail( function( xhr, status, error ) {
			var $e = $( '<div class="ajax-error"></div>' ).text( error.message );
			$form.after( $e );
		} );
	};

	wpcf7.triggerEvent = function( target, name, detail ) {
		var $target = $( target );

		/* DOM event */
		var event = new CustomEvent( 'wpcf7' + name, {
			bubbles: true,
			detail: detail
		} );

		$target.get( 0 ).dispatchEvent( event );

		/* jQuery event */
		$target.trigger( 'wpcf7:' + name, detail );
		$target.trigger( name + '.wpcf7', detail ); // deprecated
	};

	wpcf7.toggleSubmit = function( form, state ) {
		var $form = $( form );
		var $submit = $( 'input:submit', $form );

		if ( typeof state !== 'undefined' ) {
			$submit.prop( 'disabled', ! state );
			return;
		}

		if ( $form.hasClass( 'wpcf7-acceptance-as-validation' ) ) {
			return;
		}

		$submit.prop( 'disabled', false );

		$( 'input:checkbox.wpcf7-acceptance', $form ).each( function() {
			var $a = $( this );

			if ( $a.hasClass( 'wpcf7-invert' ) && $a.is( ':checked' )
			|| ! $a.hasClass( 'wpcf7-invert' ) && ! $a.is( ':checked' ) ) {
				$submit.prop( 'disabled', true );
				return false;
			}
		} );
	};

	wpcf7.notValidTip = function( target, message ) {
		var $target = $( target );
		$( '.wpcf7-not-valid-tip', $target ).remove();
		$( '<span role="alert" class="wpcf7-not-valid-tip"></span>' )
			.text( message ).appendTo( $target );

		if ( $target.is( '.use-floating-validation-tip *' ) ) {
			var fadeOut = function( target ) {
				$( target ).not( ':hidden' ).animate( {
					opacity: 0
				}, 'fast', function() {
					$( this ).css( { 'z-index': -100 } );
				} );
			};

			$target.on( 'mouseover', '.wpcf7-not-valid-tip', function() {
				fadeOut( this );
			} );

			$target.on( 'focus', ':input', function() {
				fadeOut( $( '.wpcf7-not-valid-tip', $target ) );
			} );
		}
	};

	wpcf7.refill = function( form, data ) {
		var $form = $( form );

		var refillCaptcha = function( $form, items ) {
			$.each( items, function( i, n ) {
				$form.find( ':input[name="' + i + '"]' ).val( '' );
				$form.find( 'img.wpcf7-captcha-' + i ).attr( 'src', n );
				var match = /([0-9]+)\.(png|gif|jpeg)$/.exec( n );
				$form.find( 'input:hidden[name="_wpcf7_captcha_challenge_' + i + '"]' ).attr( 'value', match[ 1 ] );
			} );
		};

		var refillQuiz = function( $form, items ) {
			$.each( items, function( i, n ) {
				$form.find( ':input[name="' + i + '"]' ).val( '' );
				$form.find( ':input[name="' + i + '"]' ).siblings( 'span.wpcf7-quiz-label' ).text( n[ 0 ] );
				$form.find( 'input:hidden[name="_wpcf7_quiz_answer_' + i + '"]' ).attr( 'value', n[ 1 ] );
			} );
		};

		if ( typeof data === 'undefined' ) {
			$.ajax( {
				type: 'GET',
				url: wpcf7.apiSettings.getRoute(
					'/contact-forms/' + wpcf7.getId( $form ) + '/refill' ),
				dataType: 'json'
			} ).done( function( data, status, xhr ) {
				if ( data.captcha ) {
					refillCaptcha( $form, data.captcha );
				}

				if ( data.quiz ) {
					refillQuiz( $form, data.quiz );
				}
			} );

		} else {
			if ( data.captcha ) {
				refillCaptcha( $form, data.captcha );
			}

			if ( data.quiz ) {
				refillQuiz( $form, data.quiz );
			}
		}
	};

	wpcf7.clearResponse = function( form ) {
		var $form = $( form );
		$form.removeClass( 'invalid spam sent failed' );
		$form.siblings( '.screen-reader-response' ).html( '' ).attr( 'role', '' );

		$( '.wpcf7-not-valid-tip', $form ).remove();
		$( '[aria-invalid]', $form ).attr( 'aria-invalid', 'false' );
		$( '.wpcf7-form-control', $form ).removeClass( 'wpcf7-not-valid' );

		$( '.wpcf7-response-output', $form )
			.hide().empty().removeAttr( 'role' )
			.removeClass( 'wpcf7-mail-sent-ok wpcf7-mail-sent-ng wpcf7-validation-errors wpcf7-spam-blocked' );
	};

	wpcf7.apiSettings.getRoute = function( path ) {
		var url = wpcf7.apiSettings.root;

		url = url.replace(
			wpcf7.apiSettings.namespace,
			wpcf7.apiSettings.namespace + path );

		return url;
	};

} )( jQuery );

/*
 * Polyfill for Internet Explorer
 * See https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent
 */
( function () {
	if ( typeof window.CustomEvent === "function" ) return false;

	function CustomEvent ( event, params ) {
		params = params || { bubbles: false, cancelable: false, detail: undefined };
		var evt = document.createEvent( 'CustomEvent' );
		evt.initCustomEvent( event,
			params.bubbles, params.cancelable, params.detail );
		return evt;
	}

	CustomEvent.prototype = window.Event.prototype;

	window.CustomEvent = CustomEvent;
} )();


	jQuery(document).ready(function() {
		jQuery('#slider_74').owlCarousel({
			responsive:{
				0:{ items:1 },
				480:{ items:2 },
				768:{ items:3 },
				980:{ items:4 },
				1200:{ items:5 },
				1500:{ items:5 }
			},
			autoplay : true,
			autoplayTimeout : 5000,
			smartSpeed : 200,
			fluidSpeed : 200,
			autoplaySpeed : 200,
			navSpeed : 200,
			dotsSpeed : 200,
			loop : true,
			autoplayHoverPause : true,
			nav : true,
			navText : ['',''],
			dots : true,
			responsiveRefreshRate : 200,
			mergeFit : true,
			mouseDrag : true,
			touchDrag : true
		});
		sa_resize_slider_74();
		window.addEventListener('resize', sa_resize_slider_74);
		function sa_resize_slider_74() {
			var min_height = '50';
			var win_width = jQuery(window).width();
			var slider_width = jQuery('#slider_74').width();
			if (win_width < 480) {
				var slide_width = slider_width / 1;
			} else if (win_width < 768) {
				var slide_width = slider_width / 2;
			} else if (win_width < 980) {
				var slide_width = slider_width / 3;
			} else if (win_width < 1200) {
				var slide_width = slider_width / 4;
			} else if (win_width < 1500) {
				var slide_width = slider_width / 5;
			} else {
				var slide_width = slider_width / 5;
			}
			slide_width = Math.round(slide_width);
			var slide_height = '0';
			if (min_height == 'aspect43') {
				slide_height = (slide_width / 4) * 3;				slide_height = Math.round(slide_height);
			} else if (min_height == 'aspect169') {
				slide_height = (slide_width / 16) * 9;				slide_height = Math.round(slide_height);
			} else {
				slide_height = (slide_width / 100) * min_height;				slide_height = Math.round(slide_height);
			}
			jQuery('#slider_74 .owl-item .sa_hover_container').css('min-height', slide_height+'px');
		}
	});

	jQuery(document).ready(function($) {

	var ResponsiveMenu = {
			trigger: '#responsive-menu-button',
			animationSpeed: 500,
			breakpoint: 991,
			pushButton: 'off',
			animationType: 'slide',
			animationSide: 'left',
			pageWrapper: '',
			isOpen: false,
			triggerTypes: 'click',
			activeClass: 'is-active',
			container: '#responsive-menu-container',
			openClass: 'responsive-menu-open',
			accordion: 'off',
			activeArrow: '▲',
			inactiveArrow: '▼',
			wrapper: '#responsive-menu-wrapper',
			closeOnBodyClick: 'on',
			closeOnLinkClick: 'on',
			itemTriggerSubMenu: 'off',
			linkElement: '.responsive-menu-item-link',
			openMenu: function() {
					$(this.trigger).addClass(this.activeClass);
					$('html').addClass(this.openClass);
					$('.responsive-menu-button-icon-active').hide();
					$('.responsive-menu-button-icon-inactive').show();
					this.setButtonTextOpen();
					this.setWrapperTranslate();
					this.isOpen = true;
			},
			closeMenu: function() {
					$(this.trigger).removeClass(this.activeClass);
					$('html').removeClass(this.openClass);
					$('.responsive-menu-button-icon-inactive').hide();
					$('.responsive-menu-button-icon-active').show();
					this.setButtonText();
					this.clearWrapperTranslate();
					this.isOpen = false;
			},
			setButtonText: function() {
					if($('.responsive-menu-button-text-open').length > 0 && $('.responsive-menu-button-text').length > 0) {
							$('.responsive-menu-button-text-open').hide();
							$('.responsive-menu-button-text').show();
					}
			},
			setButtonTextOpen: function() {
					if($('.responsive-menu-button-text').length > 0 && $('.responsive-menu-button-text-open').length > 0) {
							$('.responsive-menu-button-text').hide();
							$('.responsive-menu-button-text-open').show();
					}
			},
			triggerMenu: function() {
					this.isOpen ? this.closeMenu() : this.openMenu();
			},
			triggerSubArrow: function(subarrow) {
					var sub_menu = $(subarrow).parent().siblings('.responsive-menu-submenu');
					var self = this;
					if(this.accordion == 'on') {
							/* Get Top Most Parent and the siblings */
							var top_siblings = sub_menu.parents('.responsive-menu-item-has-children').last().siblings('.responsive-menu-item-has-children');
							var first_siblings = sub_menu.parents('.responsive-menu-item-has-children').first().siblings('.responsive-menu-item-has-children');
							/* Close up just the top level parents to key the rest as it was */
							top_siblings.children('.responsive-menu-submenu').slideUp(200, 'linear').removeClass('responsive-menu-submenu-open');
							/* Set each parent arrow to inactive */
							top_siblings.each(function() {
									$(this).find('.responsive-menu-subarrow').first().html(self.inactiveArrow);
									$(this).find('.responsive-menu-subarrow').first().removeClass('responsive-menu-subarrow-active');
							});
							/* Now Repeat for the current item siblings */
							first_siblings.children('.responsive-menu-submenu').slideUp(200, 'linear').removeClass('responsive-menu-submenu-open');
							first_siblings.each(function() {
									$(this).find('.responsive-menu-subarrow').first().html(self.inactiveArrow);
									$(this).find('.responsive-menu-subarrow').first().removeClass('responsive-menu-subarrow-active');
							});
					}
					if(sub_menu.hasClass('responsive-menu-submenu-open')) {
							sub_menu.slideUp(200, 'linear').removeClass('responsive-menu-submenu-open');
							$(subarrow).html(this.inactiveArrow);
							$(subarrow).removeClass('responsive-menu-subarrow-active');
					} else {
							sub_menu.slideDown(200, 'linear').addClass('responsive-menu-submenu-open');
							$(subarrow).html(this.activeArrow);
							$(subarrow).addClass('responsive-menu-subarrow-active');
					}
			},
			menuHeight: function() {
					return $(this.container).height();
			},
			menuWidth: function() {
					return $(this.container).width();
			},
			wrapperHeight: function() {
					return $(this.wrapper).height();
			},
			setWrapperTranslate: function() {
					switch(this.animationSide) {
							case 'left':
									translate = 'translateX(' + this.menuWidth() + 'px)'; break;
							case 'right':
									translate = 'translateX(-' + this.menuWidth() + 'px)'; break;
							case 'top':
									translate = 'translateY(' + this.wrapperHeight() + 'px)'; break;
							case 'bottom':
									translate = 'translateY(-' + this.menuHeight() + 'px)'; break;
					}
					if(this.animationType == 'push') {
							$(this.pageWrapper).css({'transform':translate});
							$('html, body').css('overflow-x', 'hidden');
					}
					if(this.pushButton == 'on') {
							$('#responsive-menu-button').css({'transform':translate});
					}
			},
			clearWrapperTranslate: function() {
					var self = this;
					if(this.animationType == 'push') {
							$(this.pageWrapper).css({'transform':''});
							setTimeout(function() {
									$('html, body').css('overflow-x', '');
							}, self.animationSpeed);
					}
					if(this.pushButton == 'on') {
							$('#responsive-menu-button').css({'transform':''});
					}
			},
			init: function() {
					var self = this;
					$(this.trigger).on(this.triggerTypes, function(e){
							e.stopPropagation();
							self.triggerMenu();
					});
					$(this.trigger).mouseup(function(){
							$(self.trigger).blur();
					});
					$('.responsive-menu-subarrow').on('click', function(e) {
							e.preventDefault();
							e.stopPropagation();
							self.triggerSubArrow(this);
					});
					$(window).resize(function() {
							if($(window).width() > self.breakpoint) {
									if(self.isOpen){
											self.closeMenu();
									}
							} else {
									if($('.responsive-menu-open').length>0){
											self.setWrapperTranslate();
									}
							}
					});
					if(this.closeOnLinkClick == 'on') {
							$(this.linkElement).on('click', function(e) {
									e.preventDefault();
									/* Fix for when close menu on parent clicks is on */
									if(self.itemTriggerSubMenu == 'on' && $(this).is('.responsive-menu-item-has-children > ' + self.linkElement)) {
											return;
									}
									old_href = $(this).attr('href');
									old_target = typeof $(this).attr('target') == 'undefined' ? '_self' : $(this).attr('target');
									if(self.isOpen) {
											if($(e.target).closest('.responsive-menu-subarrow').length) {
													return;
											}
											self.closeMenu();
											setTimeout(function() {
													window.open(old_href, old_target);
											}, self.animationSpeed);
									}
							});
					}
					if(this.closeOnBodyClick == 'on') {
							$(document).on('click', 'body', function(e) {
									if(self.isOpen) {
											if($(e.target).closest('#responsive-menu-container').length || $(e.target).closest('#responsive-menu-button').length) {
													return;
											}
									}
									self.closeMenu();
							});
					}
					if(this.itemTriggerSubMenu == 'on') {
							$('.responsive-menu-item-has-children > ' + this.linkElement).on('click', function(e) {
									e.preventDefault();
									self.triggerSubArrow($(this).children('.responsive-menu-subarrow').first());
							});
					}
			}
	};
	ResponsiveMenu.init();
});
