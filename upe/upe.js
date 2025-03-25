/**
 * UnifiedPointerEvents - Enhanced Version
 * A unified event manager for mouse, touch, and pen inputs
 * Provides consistent event handling across input methods with advanced gesture recognition
 * Supports longclick, doubleclick, swipe, drag, fling, rotate, pinchzoom and more
 * Uses setPointerCapture/releasePointerCapture API for improved control
 * version 1.4.0
 */
class UnifiedPointerEvents {
  constructor() {
    // Event listener management
    this.eventListeners = new Map(); // id -> listener info
    this.listenerCounter = 0;
    
    // Debug mode (enables/disables console logging)
    this.debugMode = false;
    
    // Feature detection for better browser compatibility
    this.features = {
      pointerEvents: 'PointerEvent' in window,
      touch: 'ontouchstart' in window,
      mouse: 'onmousedown' in window,
      passiveEvents: this._checkPassiveEventSupport(),
      pointerCapture: 'PointerEvent' in window && HTMLElement.prototype.hasOwnProperty('setPointerCapture')
    };
    
    // Default settings
    this.defaults = {
      longClickDelay: 500,
      doubleClickDelay: 300,
      swipeThreshold: 50,
      swipeTimeout: 300,
      flingMinVelocity: 600,    // Minimum velocity for fling (px/s)
      flingDecay: 0.95,         // Fling deceleration factor
      usePointerCapture: true,  // Default value for setPointerCapture usage
      touchOffsetX: 0,          // Touch event X-axis offset
      touchOffsetY: -20,        // Touch event Y-axis offset (20px up)
      rotateStepDeg: 5,         // Rotation step (degrees)
      pinchZoomStep: 0.05,      // Pinch zoom step
      minScale: 0.1,            // Minimum scale factor
      maxScale: 10.0,           // Maximum scale factor
      touchFingerDistance: 30,  // Minimum distance for multi-touch (px)
      throttleMs: 16            // Default throttle value for high-frequency events (≈60fps)
    };
    
    // Event type mapping for different input methods
    this._eventMapping = {
      mouse: {
        'start': 'mousedown',
        'move': 'mousemove',
        'end': 'mouseup',
        'cancel': 'mouseleave'
      },
      touch: {
        'start': 'touchstart',
        'move': 'touchmove',
        'end': 'touchend',
        'cancel': 'touchcancel'
      },
      pointer: {
        'start': 'pointerdown',
        'move': 'pointermove',
        'end': 'pointerup',
        'cancel': 'pointercancel',
        'gotcapture': 'gotpointercapture',
        'lostcapture': 'lostpointercapture'
      }
    };
    
    // Supported event types
    this._validEventTypes = new Set([
      'start', 'move', 'end', 'cancel', 
      'longclick', 'doubleclick', 'swipe', 'fling',
      'dragstart', 'drag', 'dragend',
      'gotcapture', 'lostcapture',
      'rotate', 'pinchzoom' // Gesture events
    ]);
    
    // Active multi-touch tracking
    this._activeTouches = new Map(); // touchId -> touchInfo
    
    this._debug('UnifiedPointerEvents initialized', this.features);
  }

  /**
   * Checks if passive event listeners are supported
   * @private
   * @returns {boolean} Whether passive events are supported
   */
  _checkPassiveEventSupport() {
    let supportsPassive = false;
    try {
      // Create options object with a getter for passive property
      const opts = Object.defineProperty({}, 'passive', {
        get: function() {
          supportsPassive = true;
          return true;
        }
      });
      // Add a dummy event listener with the options
      window.addEventListener('testPassive', null, opts);
      window.removeEventListener('testPassive', null, opts);
    } catch (e) {
      // Passive events not supported
    }
    return supportsPassive;
  }

  /**
   * Internal logging method for debugging
   * @private
   * @param {...any} args - Arguments to log
   */
  _debug(...args) {
    if (this.debugMode) {
      console.log('[UnifiedPointerEvents]', ...args);
    }
  }

  /**
   * Generates a unique listener ID
   * @private
   * @returns {string} Unique listener ID
   */
  _generateListenerId() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${timestamp}-${random}-${this.listenerCounter++}`;
  }

  /**
   * Adds a unified pointer event listener to an element
   * @param {HTMLElement} element - Element to attach the event listener
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   * @param {Object} options - Event listener options
   * @returns {string} Event listener identifier
   */
  addEventListener(element, eventType, callback, options = {}) {
    // Validate required parameters
    if (!element || !eventType || !callback) {
      throw new Error('Missing required parameters: element, eventType, callback');
    }

    // Validate event type
    if (!this._validEventTypes.has(eventType)) {
      throw new Error(`Unsupported event type: ${eventType}`);
    }
    
    // Check for existing identical listener
    let existingListenerId = this._findExistingListener(element, eventType, callback);
    if (existingListenerId !== null) {
      this._debug(`Duplicate event listener detected: element=${element}, eventType=${eventType}, returning existing listener ID: ${existingListenerId}`);
      return existingListenerId;
    }

    // Generate unique listener ID
    const listenerId = this._generateListenerId();
    
    // Create listener info object
    const listenerInfo = { 
      element, 
      eventType, 
      callback, 
      options: { ...options }, // Clone options to avoid external modification
      nativeListeners: [],
      state: {}, // Object to store event state (independent for each listener)
      registrationTime: Date.now()
    };

    // Setup event handlers based on event type
    if (['longclick', 'doubleclick', 'swipe', 'fling', 'rotate', 'pinchzoom'].includes(eventType)) {
      this._setupGestureEvents(element, eventType, callback, options, listenerId, listenerInfo);
    } 
    else if (['dragstart', 'drag', 'dragend'].includes(eventType)) {
      this._setupDragEvents(element, eventType, callback, options, listenerId, listenerInfo);
    } 
    else if (['gotcapture', 'lostcapture'].includes(eventType)) {
      this._setupCaptureEvents(element, eventType, callback, options, listenerId, listenerInfo);
    }
    else {
      // Setup basic events
      this._setupBasicEvents(element, eventType, callback, options, listenerId, listenerInfo);
    }

    // Save listener info
    this.eventListeners.set(listenerId, listenerInfo);
    this._debug(`Added ${eventType} listener to ${element.tagName || 'element'}, ID: ${listenerId}`);
    
    return listenerId;
  }

  /**
   * Finds an existing identical listener
   * @private
   * @param {HTMLElement} element - Event target element
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback function
   * @returns {string|null} Existing listener ID or null
   */
  _findExistingListener(element, eventType, callback) {
    // Check all listeners for a matching combination
    for (const [id, info] of this.eventListeners.entries()) {
      if (info.element === element && 
          info.eventType === eventType && 
          info.callback === callback) {
        return id;
      }
    }
    return null;
  }

  /**
   * Helper function to register event listeners
   * @private
   * @param {HTMLElement} element - Event target element
   * @param {boolean} hasPointerEvents - Whether pointer events are supported
   * @param {Array} eventMappings - Event mapping array [{type, handler}]
   * @param {Object} options - Event listener options
   * @param {Object} listenerInfo - Listener info object
   */
  _registerEventListeners(element, hasPointerEvents, eventMappings, options, listenerInfo) {
    try {
      // Adjust options for passive vs preventDefault
      const listenerOptions = { ...options };
      if (options.preventDefault && this.features.passiveEvents) {
        listenerOptions.passive = false;
      }
      
      if (hasPointerEvents) {
        // Register pointer events
        eventMappings.forEach(mapping => {
          try {
            const pointerType = this._eventMapping.pointer[mapping.type] || mapping.type;
            element.addEventListener(pointerType, mapping.handler, listenerOptions);
            listenerInfo.nativeListeners.push({
              type: pointerType,
              handler: mapping.handler,
              element,
              options: listenerOptions
            });
            this._debug(`Added pointer event listener: ${pointerType}`);
          } catch (error) {
            this._debug(`Failed to register pointer event: ${error.message}`);
          }
        });
      } else {
        // Register touch events
        if (this.features.touch) {
          eventMappings.forEach(mapping => {
            try {
              const touchType = this._eventMapping.touch[mapping.type] || mapping.type;
              element.addEventListener(touchType, mapping.handler, listenerOptions);
              listenerInfo.nativeListeners.push({
                type: touchType,
                handler: mapping.handler,
                element,
                options: listenerOptions
              });
              this._debug(`Added touch event listener: ${touchType}`);
            } catch (error) {
              this._debug(`Failed to register touch event: ${error.message}`);
            }
          });
        }
        
        // Register mouse events
        if (this.features.mouse) {
          eventMappings.forEach(mapping => {
            try {
              const mouseType = this._eventMapping.mouse[mapping.type] || mapping.type;
              element.addEventListener(mouseType, mapping.handler, listenerOptions);
              listenerInfo.nativeListeners.push({
                type: mouseType,
                handler: mapping.handler,
                element,
                options: listenerOptions
              });
              this._debug(`Added mouse event listener: ${mouseType}`);
            } catch (error) {
              this._debug(`Failed to register mouse event: ${error.message}`);
            }
          });
        }
      }
    } catch (error) {
      this._debug(`Event registration failed: ${error.message}`);
    }
  }

  /**
   * Sets up basic event listeners
   * @private
   */
  _setupBasicEvents(element, eventType, callback, options, listenerId, listenerInfo) {
    const hasPointerEvents = this.features.pointerEvents;
    
    // Event handler
    const handleEvent = (event) => {
      // Input device filtering
      if (eventType === 'start') {
        // Apply device filtering if specified
        if ((options.penOnly && event.pointerType !== 'pen') ||
            (options.touchOnly && event.pointerType !== 'touch') ||
            (options.mouseOnly && event.pointerType !== 'mouse')) {
          return;
        }
      }
      
      // Prevent default behavior if requested
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('Failed to prevent default:', e.message);
        }
      }
      
      // Call the callback with the unified event
      callback(this._createUnifiedEvent(event, eventType));
    };
    
    // Register event listeners
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [{ type: eventType, handler: handleEvent }], 
      options, 
      listenerInfo
    );
  }

  /**
   * Sets up pointer capture event listeners
   * @private
   */
  _setupCaptureEvents(element, eventType, callback, options, listenerId, listenerInfo) {
    // Check if pointer events are supported
    if (!this.features.pointerCapture) {
      this._debug('This browser does not support pointer capture events');
      return;
    }
    
    // Map event type to native event
    const captureEventType = eventType === 'gotcapture' 
      ? 'gotpointercapture' 
      : 'lostpointercapture';
    
    // Capture event handler
    const captureHandler = (event) => {
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('Failed to prevent default:', e.message);
        }
      }
      
      // Call the callback with the unified event
      callback(this._createUnifiedEvent(event, eventType));
    };
    
    // Set listener options
    const listenerOptions = { ...options };
    if (options.preventDefault && this.features.passiveEvents) {
      listenerOptions.passive = false;
    }
    
    // Add event listener
    try {
      element.addEventListener(captureEventType, captureHandler, listenerOptions);
      listenerInfo.nativeListeners.push({ 
        type: captureEventType, 
        handler: captureHandler, 
        element,
        options: listenerOptions
      });
      this._debug(`Added ${captureEventType} listener`);
    } catch (error) {
      this._debug(`Failed to add ${captureEventType} listener:`, error.message);
    }
  }

  /**
   * Creates a unified event object
   * @private
   * @param {Event} originalEvent - Original browser event
   * @param {string} eventType - Unified event type
   * @param {Object} additionalData - Additional event data
   * @returns {Object} Unified event object
   */
  _createUnifiedEvent(originalEvent, eventType, additionalData = {}) {
    // Extract event data based on event type
    let pointerType, pointerId, clientX, clientY, pageX, pageY, isPrimary, pressure;
    
    // Handle touch events
    if (originalEvent.type.startsWith('touch') && originalEvent.touches) {
      pointerType = 'touch';
      
      // Find the correct touch object
      let touch;
      
      if (originalEvent.type === 'touchend' || originalEvent.type === 'touchcancel') {
        // For touchend/cancel, check changedTouches
        if (additionalData.trackingTouchId !== undefined) {
          for (let i = 0; i < originalEvent.changedTouches.length; i++) {
            if (originalEvent.changedTouches[i].identifier === additionalData.trackingTouchId) {
              touch = originalEvent.changedTouches[i];
              break;
            }
          }
        }
        // Fallback to first touch
        touch = touch || originalEvent.changedTouches[0] || {};
      } else {
        // For other events, check active touches
        if (additionalData.trackingTouchId !== undefined) {
          for (let i = 0; i < originalEvent.touches.length; i++) {
            if (originalEvent.touches[i].identifier === additionalData.trackingTouchId) {
              touch = originalEvent.touches[i];
              break;
            }
          }
        }
        // Fallback to first touch
        touch = touch || originalEvent.touches[0] || {};
      }
      
      // Extract touch data
      pointerId = touch.identifier || 1;
      clientX = touch.clientX || 0;
      clientY = touch.clientY || 0;
      // Get pageX/Y directly from touch object
      pageX = touch.pageX || (clientX + window.pageXOffset);
      pageY = touch.pageY || (clientY + window.pageYOffset);
      isPrimary = true;
      pressure = touch.force || 0;
      
      // Apply touch offset
      clientY += this.defaults.touchOffsetY;
      clientX += this.defaults.touchOffsetX;
      pageY += this.defaults.touchOffsetY;
      pageX += this.defaults.touchOffsetX;
    } 
    // Handle pointer events
    else if (originalEvent.type.startsWith('pointer') || 
             originalEvent.type.startsWith('got') || 
             originalEvent.type.startsWith('lost')) {
      pointerType = originalEvent.pointerType || 'mouse';
      pointerId = originalEvent.pointerId || 1;
      clientX = originalEvent.clientX || 0;
      clientY = originalEvent.clientY || 0;
      pageX = originalEvent.pageX || (clientX + window.pageXOffset);
      pageY = originalEvent.pageY || (clientY + window.pageYOffset);
      isPrimary = originalEvent.isPrimary !== undefined ? originalEvent.isPrimary : true;
      pressure = originalEvent.pressure || 0;
      
      // Apply offset only for touch type pointers
      if (pointerType === 'touch') {
        clientY += this.defaults.touchOffsetY;
        clientX += this.defaults.touchOffsetX;
        pageY += this.defaults.touchOffsetY;
        pageX += this.defaults.touchOffsetX;
      }
    } 
    // Handle wheel events
    else if (originalEvent.type === 'wheel') {
      pointerType = 'mouse';
      pointerId = 1;
      clientX = originalEvent.clientX || 0;
      clientY = originalEvent.clientY || 0;
      pageX = originalEvent.pageX || (clientX + window.pageXOffset);
      pageY = originalEvent.pageY || (clientY + window.pageYOffset);
      isPrimary = true;
      pressure = 0;
    }
    // Handle mouse events
    else {
      pointerType = 'mouse';
      pointerId = 1;
      clientX = originalEvent.clientX || 0;
      clientY = originalEvent.clientY || 0;
      pageX = originalEvent.pageX || (clientX + window.pageXOffset);
      pageY = originalEvent.pageY || (clientY + window.pageYOffset);
      isPrimary = true;
      pressure = originalEvent.buttons ? 0.5 : 0;
    }

    // Create unified event object
    const unifiedEvent = {
      originalEvent,
      type: eventType,
      pointerType,
      pointerId,
      clientX,
      clientY,
      pageX,
      pageY,
      isPrimary,
      pressure,
      // Original event methods
      preventDefault: () => {
        try {
          originalEvent.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      },
      stopPropagation: () => {
        try {
          originalEvent.stopPropagation();
        } catch (e) {
          this._debug('stopPropagation failed:', e.message);
        }
      },
      stopImmediatePropagation: originalEvent.stopImmediatePropagation 
        ? () => {
            try {
              originalEvent.stopImmediatePropagation();
            } catch (e) {
              this._debug('stopImmediatePropagation failed:', e.message);
              // Fallback to regular stopPropagation
              originalEvent.stopPropagation();
            }
          } 
        : () => originalEvent.stopPropagation(),
      // Pointer capture methods
      setPointerCapture: (element) => this._setPointerCapture(element, pointerId, unifiedEvent),
      releasePointerCapture: (element) => this._releasePointerCapture(element, pointerId, unifiedEvent)
    };
    
    // Add additional data
    for (const key in additionalData) {
      unifiedEvent[key] = additionalData[key];
    }
    
    return unifiedEvent;
  }

  /**
   * Sets up gesture event handlers
   * @private
   */
  _setupGestureEvents(element, eventType, callback, options, listenerId, listenerInfo) {
    // Merge default options with user options
    const mergedOptions = {
      longClickDelay: options.longClickDelay || this.defaults.longClickDelay,
      doubleClickDelay: options.doubleClickDelay || this.defaults.doubleClickDelay,
      swipeThreshold: options.swipeThreshold || this.defaults.swipeThreshold,
      swipeTimeout: options.swipeTimeout || this.defaults.swipeTimeout,
      flingMinVelocity: options.flingMinVelocity || this.defaults.flingMinVelocity,
      flingDecay: options.flingDecay || this.defaults.flingDecay,
      rotateStepDeg: options.rotateStepDeg || this.defaults.rotateStepDeg,
      pinchZoomStep: options.pinchZoomStep || this.defaults.pinchZoomStep,
      preventDefault: !!options.preventDefault,
      usePointerCapture: options.usePointerCapture !== undefined 
        ? options.usePointerCapture 
        : this.defaults.usePointerCapture
    };
    
    // Initialize state for this gesture listener
    const state = listenerInfo.state;
    
    // Create isolated state for each gesture type
    if (eventType === 'longclick') {
      // Initialize longclick state
      state.longclick = {
        timerId: null,
        lastTapTime: 0,
        startX: 0,
        startY: 0,
        startTime: 0,
        active: false,
        usePointerCapture: mergedOptions.usePointerCapture,
        triggered: false,
        completed: false,
        currentPointerId: null
      };
      
      this._setupLongClickEvents(element, callback, mergedOptions, listenerId, listenerInfo);
    } 
    else if (eventType === 'doubleclick') {
      // Initialize doubleclick state
      state.doubleclick = {
        lastTapTime: 0,
        startX: 0,
        startY: 0,
        active: false,
        usePointerCapture: mergedOptions.usePointerCapture,
        completed: false,
        currentPointerId: null
      };
      
      this._setupDoubleClickEvents(element, callback, mergedOptions, listenerId, listenerInfo);
    } 
    else if (eventType === 'swipe') {
      // Initialize swipe state
      state.swipe = {
        active: false,
        startX: 0,
        startY: 0,
        startTime: 0,
        currentX: 0,
        currentY: 0,
        pointerId: null,
        usePointerCapture: mergedOptions.usePointerCapture,
        completed: false
      };
      
      this._setupSwipeEvents(element, callback, mergedOptions, listenerId, listenerInfo);
    }
    else if (eventType === 'fling') {
      // Initialize fling state
      state.fling = {
        active: false,
        points: [],
        velocityX: 0,
        velocityY: 0,
        pointerId: null,
        usePointerCapture: mergedOptions.usePointerCapture,
        completed: false
      };
      
      this._setupFlingEvents(element, callback, mergedOptions, listenerId, listenerInfo);
    }
    else if (eventType === 'rotate') {
      // Initialize rotate state
      state.rotate = {
        active: false,
        startAngle: 0,
        currentAngle: 0,
        rotation: 0,
        pointerId: null,
        centerX: 0,
        centerY: 0,
        penInitialRotation: 0,
        touch1: { id: null, startX: 0, startY: 0, currentX: 0, currentY: 0 },
        touch2: { id: null, startX: 0, startY: 0, currentX: 0, currentY: 0 },
        initialAngle: 0,
        lastAngle: 0,
        totalRotation: 0,
        usePointerCapture: mergedOptions.usePointerCapture
      };
      
      this._setupRotateEvents(element, callback, mergedOptions, listenerId, listenerInfo);
    }
    else if (eventType === 'pinchzoom') {
      // Initialize pinchzoom state
      state.pinchzoom = {
        active: false,
        startDistance: 0,
        currentDistance: 0,
        pointerId1: null,
        pointerId2: null,
        scale: 1.0,
        touch1: { id: null, startX: 0, startY: 0, currentX: 0, currentY: 0 },
        touch2: { id: null, startX: 0, startY: 0, currentX: 0, currentY: 0 },
        initialDistance: 0,
        lastDistance: 0,
        totalScale: 1.0,
        usePointerCapture: mergedOptions.usePointerCapture
      };
      
      this._setupPinchZoomEvents(element, callback, mergedOptions, listenerId, listenerInfo);
    }
  }

  /**
   * Sets up long click event handlers
   * @private
   */
  _setupLongClickEvents(element, callback, options, listenerId, listenerInfo) {
    const state = listenerInfo.state.longclick;
    const hasPointerEvents = this.features.pointerEvents;
    const longClickDelay = options.longClickDelay;
    
    // Start event handler
    const startHandler = (event) => {
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // Ignore if already tracking the same pointer
      if (state.currentPointerId === pointerId && state.active) {
        this._debug('Already tracking pointer ID for longclick:', pointerId);
        return;
      }
      
      // Reset completed flag if needed
      if (state.completed && !state.active) {
        this._debug('Resetting previous completed longclick state');
        state.completed = false;
      }
      
      // Initialize new gesture tracking
      state.active = true;
      state.startX = clientX;
      state.startY = clientY;
      state.startTime = Date.now();
      state.triggered = false;
      state.currentPointerId = pointerId;
      
      // Set pointer capture if supported
      if (state.usePointerCapture && this.features.pointerCapture && pointerId !== undefined) {
        this._debug(`Setting pointer capture for longclick: pointerId=${pointerId}`);
        try {
          element.setPointerCapture(pointerId);
        } catch (e) {
          this._debug('Failed to set pointer capture:', e.message);
        }
      }
      
      // Clear any existing timer
      if (state.timerId) {
        clearTimeout(state.timerId);
        state.timerId = null;
      }
      
      // Set longclick timer
      state.timerId = setTimeout(() => {
        // Ignore if already completed or inactive
        if (!state.active || state.triggered || 
            state.completed || state.currentPointerId !== pointerId) {
          this._debug('Ignoring longclick timer - already processed or state changed');
          return;
        }
        
        state.triggered = true;
        state.completed = true;
        
        // Create additional data for the event
        const additionalData = {
          duration: longClickDelay,
          startX: state.startX,
          startY: state.startY
        };
        
        // Trigger longclick event
        this._debug('Longclick event triggered');
        callback(this._createUnifiedEvent(event, 'longclick', additionalData));
      }, longClickDelay);
    };
    
    // End event handler
    const endHandler = (event) => {
      const endPointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // Ignore if not the tracked pointer
      if (state.currentPointerId !== endPointerId) {
        return;
      }
      
      if (state.active) {
        const clickDuration = Date.now() - state.startTime;
        
        // Cancel longclick for short clicks
        if (clickDuration < longClickDelay && state.timerId) {
          clearTimeout(state.timerId);
          state.timerId = null;
          this._debug('Regular click detected, longclick canceled');
        }
        
        // Reset active state
        state.active = false;
        
        // Release pointer capture
        if (state.usePointerCapture && this.features.pointerCapture && endPointerId !== undefined) {
          try {
            element.releasePointerCapture(endPointerId);
          } catch (e) {
            this._debug('Failed to release pointer capture:', e.message);
          }
        }
        
        // Reset state after delay to prevent accidental reactivation
        setTimeout(() => {
          state.currentPointerId = null;
          
          // Reset triggered flag if longclick occurred
          if (state.triggered) {
            state.triggered = false;
            state.completed = false;
            this._debug('Longclick state reset after completion');
          }
        }, 300);
      }
    };
    
    // Cancel event handler
    const cancelHandler = (event) => {
      // Only handle events for the current pointer
      if (state.currentPointerId === event.pointerId || event.pointerId === undefined) {
        if (state.timerId) {
          clearTimeout(state.timerId);
          state.timerId = null;
        }
        
        state.active = false;
        state.currentPointerId = null;
        
        // Reset all state
        setTimeout(() => {
          state.triggered = false;
          state.completed = false;
          this._debug('Longclick state reset due to cancellation');
        }, 100);
      }
    };
    
    // Register event listeners
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [
        { type: 'start', handler: startHandler },
        { type: 'end', handler: endHandler },
        { type: 'cancel', handler: cancelHandler }
      ], 
      options, 
      listenerInfo
    );
    
    // Add pointerleave handler for pointer events
    if (hasPointerEvents) {
      try {
        element.addEventListener('pointerleave', cancelHandler, options);
        listenerInfo.nativeListeners.push({
          type: 'pointerleave',
          handler: cancelHandler,
          element,
          options
        });
      } catch (error) {
        this._debug('Failed to add pointerleave handler:', error.message);
      }
    }
  }

  /**
   * Sets up double click event handlers
   * @private
   */
  _setupDoubleClickEvents(element, callback, options, listenerId, listenerInfo) {
    const state = listenerInfo.state.doubleclick;
    const hasPointerEvents = this.features.pointerEvents;
    const doubleClickDelay = options.doubleClickDelay;
    
    // Start event handler
    const startHandler = (event) => {
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // Ignore if already tracking same pointer
      if (state.currentPointerId === pointerId && state.active) {
        this._debug('Already tracking pointer ID for doubleclick:', pointerId);
        return;
      }
      
      const now = Date.now();
      const timeSinceLastTap = now - state.lastTapTime;
      
      // Check for double click
      if (timeSinceLastTap < doubleClickDelay && !state.completed) {
        // Create additional data for the event
        const additionalData = {
          interval: timeSinceLastTap,
          startX: state.startX,
          startY: state.startY
        };
        
        // Mark as completed
        state.completed = true;
        this._debug('Doubleclick event triggered');
        callback(this._createUnifiedEvent(event, 'doubleclick', additionalData));
        state.lastTapTime = 0; // Reset tap time
        
        // Reset state after delay
        setTimeout(() => {
          state.active = false;
          state.completed = false;
          state.currentPointerId = null;
          this._debug('Doubleclick state reset after completion');
        }, 300);
      } else {
        // Record first tap
        state.active = true;
        state.startX = clientX;
        state.startY = clientY;
        state.lastTapTime = now;
        state.currentPointerId = pointerId;
        
        // Set pointer capture if supported
        if (state.usePointerCapture && this.features.pointerCapture && pointerId !== undefined) {
          this._debug(`Setting pointer capture for doubleclick: pointerId=${pointerId}`);
          try {
            element.setPointerCapture(pointerId);
          } catch (e) {
            this._debug('Failed to set pointer capture:', e.message);
          }
        }
      }
    };
    
    // End event handler
    const endHandler = (event) => {
      const endPointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // Ignore if not the tracked pointer
      if (state.currentPointerId !== endPointerId) {
        return;
      }
      
      if (state.active) {
        // Reset active state
        state.active = false;
        
        // Release pointer capture
        if (state.usePointerCapture && this.features.pointerCapture && endPointerId !== undefined) {
          try {
            element.releasePointerCapture(endPointerId);
          } catch (e) {
            this._debug('Failed to release pointer capture:', e.message);
          }
        }
        
        // Reset state after doubleclick timeout
        setTimeout(() => {
          if (Date.now() - state.lastTapTime > doubleClickDelay) {
            state.currentPointerId = null;
            state.lastTapTime = 0;
            state.completed = false;
            this._debug('Doubleclick timeout, state reset');
          }
        }, doubleClickDelay + 50);
      }
    };
    
    // Cancel event handler
    const cancelHandler = (event) => {
      // Only handle events for the current pointer
      if (state.currentPointerId === event.pointerId || event.pointerId === undefined) {
        state.active = false;
        state.currentPointerId = null;
        
        // Don't reset lastTapTime to allow doubleclick detection across cancellations
      }
    };
    
    // Register event listeners
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [
        { type: 'start', handler: startHandler },
        { type: 'end', handler: endHandler },
        { type: 'cancel', handler: cancelHandler }
      ], 
      options, 
      listenerInfo
    );
    
    // Add pointerleave handler for pointer events
    if (hasPointerEvents) {
      try {
        element.addEventListener('pointerleave', cancelHandler, options);
        listenerInfo.nativeListeners.push({
          type: 'pointerleave',
          handler: cancelHandler,
          element,
          options
        });
      } catch (error) {
        this._debug('Failed to add pointerleave handler:', error.message);
      }
    }
  }

  /**
   * Sets up swipe event handlers
   * @private
   */
  _setupSwipeEvents(element, callback, options, listenerId, listenerInfo) {
    const state = listenerInfo.state.swipe;
    const hasPointerEvents = this.features.pointerEvents;
    const swipeThreshold = options.swipeThreshold;
    const swipeTimeout = options.swipeTimeout;
    
    // Start event handler
    const startHandler = (event) => {
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // Ignore if already tracking same pointer
      if (state.pointerId === pointerId && state.active) {
        this._debug('Already tracking pointer ID for swipe:', pointerId);
        return;
      }
      
      // Initialize swipe tracking
      state.active = true;
      state.completed = false;
      state.pointerId = pointerId;
      state.startX = clientX;
      state.startY = clientY;
      state.currentX = clientX;
      state.currentY = clientY;
      state.startTime = Date.now();
      
      this._debug(`Swipe start: ID=${pointerId}, X=${state.startX}, Y=${state.startY}`);
      
      // Set pointer capture if supported
      if (state.usePointerCapture && this.features.pointerCapture && pointerId !== undefined) {
        this._debug(`Setting pointer capture for swipe: pointerId=${pointerId}`);
        try {
          element.setPointerCapture(pointerId);
        } catch (e) {
          this._debug('Failed to set pointer capture:', e.message);
        }
      }
    };
    
    // Move event handler
    const moveHandler = (event) => {
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // Ignore if not tracking this pointer
      if (state.pointerId !== pointerId) {
        return;
      }
      
      if (!state.active || state.completed) return;
      
      // Update current position
      state.currentX = clientX;
      state.currentY = clientY;
    };
    
    // End event handler
    const endHandler = (event) => {
      const eventPointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // Ignore if not tracking this pointer
      if (state.pointerId !== eventPointerId) {
        return;
      }
      
      if (!state.active || state.completed) return;
      
      // Calculate time and distance
      const now = Date.now();
      const deltaTime = now - state.startTime;
      
      // Release pointer capture
      if (state.usePointerCapture && this.features.pointerCapture && eventPointerId !== undefined) {
        try {
          element.releasePointerCapture(eventPointerId);
        } catch (e) {
          this._debug('Failed to release pointer capture:', e.message);
        }
      }
      
      // Check swipe timeout
      if (deltaTime <= swipeTimeout) {
        const deltaX = state.currentX - state.startX;
        const deltaY = state.currentY - state.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Check distance threshold
        if (distance >= swipeThreshold) {
          // Determine direction
          let direction;
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);
          
          if (absX > absY) {
            direction = deltaX > 0 ? 'right' : 'left';
          } else {
            direction = deltaY > 0 ? 'down' : 'up';
          }
          
          // Mark as completed
          state.completed = true;
          
          // Create swipe event data
          const additionalData = {
            direction,
            distance,
            deltaX,
            deltaY,
            duration: deltaTime,
            speed: distance / deltaTime,
            startX: state.startX,
            startY: state.startY,
            endX: state.currentX,
            endY: state.currentY
          };
          
          this._debug(`Swipe detected: direction=${direction}, distance=${Math.round(distance)}px, speed=${Math.round(distance/deltaTime*1000)}px/s`);
          callback(this._createUnifiedEvent(event, 'swipe', additionalData));
        }
      }
      
      // Reset swipe state
      state.active = false;
      state.pointerId = null;
      
      // Reset completed state after delay
      setTimeout(() => {
        state.completed = false;
        this._debug('Swipe state reset after completion');
      }, 300);
    };
    
    // Cancel event handler
    const cancelHandler = (event) => {
      const eventPointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // Ignore if not tracking this pointer
      if (state.pointerId !== eventPointerId) {
        return;
      }
      
      // Release pointer capture
      if (state.usePointerCapture && this.features.pointerCapture && eventPointerId !== undefined) {
        try {
          element.releasePointerCapture(eventPointerId);
        } catch (e) {
          this._debug('Failed to release pointer capture:', e.message);
        }
      }
      
      // Reset state
      state.active = false;
      state.pointerId = null;
      
      // Reset completed flag after delay
      setTimeout(() => {
        state.completed = false;
        this._debug('Swipe state reset after cancellation');
      }, 300);
    };
    
    // Register event listeners
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [
        { type: 'start', handler: startHandler },
        { type: 'move', handler: moveHandler },
        { type: 'end', handler: endHandler },
        { type: 'cancel', handler: cancelHandler }
      ], 
      options, 
      listenerInfo
    );
    
    // Add pointerleave handler for pointer events
    if (hasPointerEvents) {
      try {
        element.addEventListener('pointerleave', cancelHandler, options);
        listenerInfo.nativeListeners.push({
          type: 'pointerleave',
          handler: cancelHandler,
          element,
          options
        });
      } catch (error) {
        this._debug('Failed to add pointerleave handler:', error.message);
      }
    }
  }

  /**
   * Sets up fling event handlers
   * @private
   */
  _setupFlingEvents(element, callback, options, listenerId, listenerInfo) {
    const state = listenerInfo.state.fling;
    const hasPointerEvents = this.features.pointerEvents;
    const flingMinVelocity = options.flingMinVelocity;
    const flingDecay = options.flingDecay;
    
    // Maximum number of points to track for velocity calculation
    const MAX_VELOCITY_POINTS = 5;
    
    // Start event handler
    const startHandler = (event) => {
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      const timestamp = Date.now();
      
      // Ignore if already tracking same pointer
      if (state.pointerId === pointerId && state.active) {
        this._debug('Already tracking pointer ID for fling:', pointerId);
        return;
      }
      
      // Initialize fling tracking
      state.active = true;
      state.completed = false;
      state.pointerId = pointerId;
      state.points = [{ x: clientX, y: clientY, timestamp }];
      state.velocityX = 0;
      state.velocityY = 0;
      
      this._debug(`Fling tracking start: ID=${pointerId}, X=${clientX}, Y=${clientY}`);
      
      // Set pointer capture if supported
      if (state.usePointerCapture && this.features.pointerCapture && pointerId !== undefined) {
        this._debug(`Setting pointer capture for fling: pointerId=${pointerId}`);
        try {
          element.setPointerCapture(pointerId);
        } catch (e) {
          this._debug('Failed to set pointer capture:', e.message);
        }
      }
    };
    
    // Move event handler
    const moveHandler = (event) => {
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      const timestamp = Date.now();
      
      // Ignore if not tracking this pointer
      if (state.pointerId !== pointerId) {
        return;
      }
      
      if (!state.active || state.completed) return;
      
      // Track movement points (limit to maximum number for efficiency)
      state.points.push({ x: clientX, y: clientY, timestamp });
      
      // Keep only the most recent points
      if (state.points.length > MAX_VELOCITY_POINTS) {
        state.points.shift();
      }
    };
    
    // End event handler
    const endHandler = (event) => {
      const eventPointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // Ignore if not tracking this pointer
      if (state.pointerId !== eventPointerId) {
        return;
      }
      
      if (!state.active || state.completed) return;
      
      // Release pointer capture
      if (state.usePointerCapture && this.features.pointerCapture && eventPointerId !== undefined) {
        try {
          element.releasePointerCapture(eventPointerId);
        } catch (e) {
          this._debug('Failed to release pointer capture:', e.message);
        }
      }
      
      // Calculate velocity if enough points were recorded
      if (state.points.length >= 2) {
        const lastPoint = state.points[state.points.length - 1];
        const firstPoint = state.points[0];
        
        const deltaX = lastPoint.x - firstPoint.x;
        const deltaY = lastPoint.y - firstPoint.y;
        const deltaTime = (lastPoint.timestamp - firstPoint.timestamp) / 1000; // in seconds
        
        if (deltaTime > 0) {
          // Calculate velocity (px/sec)
          state.velocityX = deltaX / deltaTime;
          state.velocityY = deltaY / deltaTime;
          
          // Calculate total velocity magnitude
          const velocity = Math.sqrt(
            state.velocityX * state.velocityX + 
            state.velocityY * state.velocityY
          );
          
          this._debug(`Fling velocity: ${Math.round(velocity)}px/s (X: ${Math.round(state.velocityX)}, Y: ${Math.round(state.velocityY)})`);
          
          // Check if velocity exceeds minimum threshold
          if (velocity >= flingMinVelocity) {
            // Determine primary direction
            let direction;
            const absVelocityX = Math.abs(state.velocityX);
            const absVelocityY = Math.abs(state.velocityY);
            
            if (absVelocityX > absVelocityY) {
              direction = state.velocityX > 0 ? 'right' : 'left';
            } else {
              direction = state.velocityY > 0 ? 'down' : 'up';
            }
            
            // Mark as completed
            state.completed = true;
            
            // Create fling event data
            const additionalData = {
              direction,
              velocity,
              velocityX: state.velocityX,
              velocityY: state.velocityY,
              decay: flingDecay,
              startPoint: firstPoint,
              endPoint: lastPoint,
              deltaTime,
              // Position prediction function
              predictPosition: (time) => {
                const dampingFactor = Math.pow(flingDecay, time * 60); // 60fps damping
                return {
                  x: lastPoint.x + state.velocityX * time * dampingFactor,
                  y: lastPoint.y + state.velocityY * time * dampingFactor
                };
              }
            };
            
            this._debug(`Fling detected: direction=${direction}, velocity=${Math.round(velocity)}px/s`);
            callback(this._createUnifiedEvent(event, 'fling', additionalData));
          }
        }
      }
      
      // Reset fling state
      state.active = false;
      state.pointerId = null;
      state.points = [];
      
      // Reset completed flag after delay
      setTimeout(() => {
        state.completed = false;
        this._debug('Fling state reset after completion');
      }, 300);
    };
    
    // Cancel event handler
    const cancelHandler = (event) => {
      const eventPointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // Ignore if not tracking this pointer
      if (state.pointerId !== eventPointerId) {
        return;
      }
      
      // Release pointer capture
      if (state.usePointerCapture && this.features.pointerCapture && eventPointerId !== undefined) {
        try {
          element.releasePointerCapture(eventPointerId);
        } catch (e) {
          this._debug('Failed to release pointer capture:', e.message);
        }
      }
      
      // Reset state
      state.active = false;
      state.pointerId = null;
      state.points = [];
      
      // Reset completed flag after delay
      setTimeout(() => {
        state.completed = false;
        this._debug('Fling state reset after cancellation');
      }, 300);
    };
    
    // Register event listeners
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [
        { type: 'start', handler: startHandler },
        { type: 'move', handler: moveHandler },
        { type: 'end', handler: endHandler },
        { type: 'cancel', handler: cancelHandler }
      ], 
      options, 
      listenerInfo
    );
    
    // Add pointerleave handler for pointer events
    if (hasPointerEvents) {
      try {
        element.addEventListener('pointerleave', cancelHandler, options);
        listenerInfo.nativeListeners.push({
          type: 'pointerleave',
          handler: cancelHandler,
          element,
          options
        });
      } catch (error) {
        this._debug('Failed to add pointerleave handler:', error.message);
      }
    }
  }

  /**
   * Sets up rotate event handlers
   * @private
   */
  _setupRotateEvents(element, callback, options, listenerId, listenerInfo) {
    const state = listenerInfo.state.rotate;
    const hasPointerEvents = this.features.pointerEvents;
    const hasTouchEvents = this.features.touch;
    const rotateStepDeg = options.rotateStepDeg;
    const touchFingerDistance = this.defaults.touchFingerDistance;
    
    // Wheel event handler (Ctrl + wheel)
    const wheelHandler = (event) => {
      // Only handle Ctrl+wheel for rotation
      if (!event.ctrlKey || event.altKey) return;
      
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      // Calculate rotation amount based on wheel delta
      const delta = event.deltaY || event.detail || event.wheelDelta;
      const rotationDelta = delta > 0 ? -rotateStepDeg : rotateStepDeg;
      
      // Update rotation values
      state.rotation += rotationDelta;
      state.currentAngle = (state.currentAngle + rotationDelta) % 360;
      
      // Normalize angle to 0-360 range
      if (state.currentAngle < 0) state.currentAngle += 360;
      
      // Create rotate event data
      const additionalData = {
        angle: state.currentAngle,
        rotation: state.rotation,
        deltaAngle: rotationDelta,
        center: {
          x: event.clientX,
          y: event.clientY
        },
        source: 'mouse',
        isWheel: true
      };
      
      this._debug(`Mouse rotation: angle=${state.currentAngle.toFixed(2)}°, delta=${rotationDelta}°`);
      callback(this._createUnifiedEvent(event, 'rotate', additionalData));
    };
    
    // Pen rotation handler
    const penRotationHandler = (event) => {
      // Only handle pen events
      if (event.pointerType !== 'pen') return;
      
      // Check for pen rotation information
      const hasRotationInfo = typeof event.rotation === 'number' || 
                              typeof event.tiltX === 'number' || 
                              typeof event.tiltY === 'number';
                              
      if (!hasRotationInfo) return;
      
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      // Calculate current rotation
      let currentRotation = 0;
      
      // Use direct rotation if available
      if (typeof event.rotation === 'number') {
        currentRotation = event.rotation;
      } 
      // Use twist if available
      else if (typeof event.twist === 'number' && event.twist !== 0) {
        currentRotation = event.twist;
      } 
      // Estimate rotation from tilt values
      else if (typeof event.tiltX === 'number' && typeof event.tiltY === 'number') {
        currentRotation = Math.atan2(event.tiltY, event.tiltX) * 180 / Math.PI;
      }
      
      // Initialize tracking on first event
      if (!state.active) {
        state.active = true;
        state.pointerId = event.pointerId;
        state.penInitialRotation = currentRotation;
        state.startAngle = 0;
        state.currentAngle = 0;
        return;
      }
      
      // Ignore events from other pointers
      if (state.pointerId !== event.pointerId) return;
      
      // Calculate rotation change
      const deltaRotation = currentRotation - state.penInitialRotation;
      
      // Ignore tiny changes
      if (Math.abs(deltaRotation) < 1) return;
      
      // Update rotation values
      state.currentAngle = (state.startAngle + deltaRotation) % 360;
      state.rotation += deltaRotation;
      state.penInitialRotation = currentRotation;
      state.startAngle = state.currentAngle;
      
      // Normalize angle to 0-360 range
      if (state.currentAngle < 0) state.currentAngle += 360;
      
      // Create rotate event data
      const additionalData = {
        angle: state.currentAngle,
        rotation: state.rotation,
        deltaAngle: deltaRotation,
        center: {
          x: event.clientX,
          y: event.clientY
        },
        source: 'pen',
        penRotation: currentRotation,
        penTiltX: event.tiltX,
        penTiltY: event.tiltY,
        penTwist: event.twist
      };
      
      this._debug(`Pen rotation: angle=${state.currentAngle.toFixed(2)}°, delta=${deltaRotation.toFixed(2)}°`);
      callback(this._createUnifiedEvent(event, 'rotate', additionalData));
    };
    
    // Pen pointer end handler
    const penEndHandler = (event) => {
      if (event.pointerType !== 'pen') return;
      
      if (state.pointerId === event.pointerId) {
        state.active = false;
        state.pointerId = null;
      }
    };
    
    // Touch start handler (two-finger rotation)
    const touchStartHandler = (event) => {
      // Need exactly two touches for rotation
      if (event.touches.length !== 2) return;
      
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      // Calculate distance between touches
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Ensure touches are far enough apart
      if (distance < touchFingerDistance) {
        return;
      }
      
      // Initialize rotation tracking
      state.active = true;
      state.touch1 = {
        id: touch1.identifier,
        startX: touch1.clientX,
        startY: touch1.clientY,
        currentX: touch1.clientX,
        currentY: touch1.clientY
      };
      
      state.touch2 = {
        id: touch2.identifier,
        startX: touch2.clientX,
        startY: touch2.clientY,
        currentX: touch2.clientX,
        currentY: touch2.clientY
      };
      
      // Calculate center point
      state.centerX = (touch1.clientX + touch2.clientX) / 2;
      state.centerY = (touch1.clientY + touch2.clientY) / 2;
      
      // Calculate initial angle
      state.initialAngle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
      
      state.lastAngle = state.initialAngle;
      state.totalRotation = 0;
      
      this._debug(`Touch rotation start: initial angle=${state.initialAngle.toFixed(2)}°, center=(${state.centerX.toFixed(0)}, ${state.centerY.toFixed(0)})`);
    };
    
    // Touch move handler
    const touchMoveHandler = (event) => {
      if (!state.active || event.touches.length !== 2) return;
      
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      // Identify touches using stored IDs
      let touch1, touch2;
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      
      // Match touches to our stored touch IDs
      if (t1.identifier === state.touch1.id && 
          t2.identifier === state.touch2.id) {
        touch1 = t1;
        touch2 = t2;
      } else if (t1.identifier === state.touch2.id && 
                t2.identifier === state.touch1.id) {
        touch1 = t2;
        touch2 = t1;
      } else {
        // Touch IDs don't match tracked touches
        return;
      }
      
      // Update current positions
      state.touch1.currentX = touch1.clientX;
      state.touch1.currentY = touch1.clientY;
      state.touch2.currentX = touch2.clientX;
      state.touch2.currentY = touch2.clientY;
      
      // Update center point
      const newCenterX = (touch1.clientX + touch2.clientX) / 2;
      const newCenterY = (touch1.clientY + touch2.clientY) / 2;
      
      // Calculate current angle
      const currentAngle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
      
      // Calculate angle change (shortest path)
      let deltaAngle = currentAngle - state.lastAngle;
      
      // Adjust for shortest rotation path
      if (deltaAngle > 180) {
        deltaAngle -= 360;
      } else if (deltaAngle < -180) {
        deltaAngle += 360;
      }
      
      // Ignore tiny angle changes
      if (Math.abs(deltaAngle) < 1) return;
      
      // Update total rotation and last angle
      state.totalRotation += deltaAngle;
      state.lastAngle = currentAngle;
      
      // Create rotate event data
      const additionalData = {
        angle: currentAngle,
        rotation: state.totalRotation,
        deltaAngle: deltaAngle,
        center: {
          x: newCenterX,
          y: newCenterY
        },
        source: 'touch',
        touches: [
          { x: touch1.clientX, y: touch1.clientY, id: touch1.identifier },
          { x: touch2.clientX, y: touch2.clientY, id: touch2.identifier }
        ]
      };
      
      this._debug(`Touch rotation: angle=${currentAngle.toFixed(2)}°, delta=${deltaAngle.toFixed(2)}°, total=${state.totalRotation.toFixed(2)}°`);
      callback(this._createUnifiedEvent(event, 'rotate', additionalData));
    };
    
    // Touch end handler
    const touchEndHandler = (event) => {
      if (!state.active) return;
      
      // End rotation when fewer than 2 touches remain
      if (event.touches.length < 2) {
        state.active = false;
        this._debug('Touch rotation ended: touch lost');
      }
    };
    
    // Register wheel event for mouse rotation
    try {
      element.addEventListener('wheel', wheelHandler, options);
      listenerInfo.nativeListeners.push({
        type: 'wheel',
        handler: wheelHandler,
        element,
        options
      });
    } catch (error) {
      this._debug('Failed to add wheel handler:', error.message);
    }
    
    // Register pen rotation handlers
    if (hasPointerEvents) {
      try {
        element.addEventListener('pointerdown', penRotationHandler, options);
        element.addEventListener('pointermove', penRotationHandler, options);
        element.addEventListener('pointerup', penEndHandler, options);
        element.addEventListener('pointercancel', penEndHandler, options);
        element.addEventListener('pointerleave', penEndHandler, options);
        
        listenerInfo.nativeListeners.push(
          { type: 'pointerdown', handler: penRotationHandler, element, options },
          { type: 'pointermove', handler: penRotationHandler, element, options },
          { type: 'pointerup', handler: penEndHandler, element, options },
          { type: 'pointercancel', handler: penEndHandler, element, options },
          { type: 'pointerleave', handler: penEndHandler, element, options }
        );
      } catch (error) {
        this._debug('Failed to add pen rotation handlers:', error.message);
      }
    }
    
    // Register touch rotation handlers
    if (hasTouchEvents) {
      try {
        element.addEventListener('touchstart', touchStartHandler, options);
        element.addEventListener('touchmove', touchMoveHandler, options);
        element.addEventListener('touchend', touchEndHandler, options);
        element.addEventListener('touchcancel', touchEndHandler, options);
        
        listenerInfo.nativeListeners.push(
          { type: 'touchstart', handler: touchStartHandler, element, options },
          { type: 'touchmove', handler: touchMoveHandler, element, options },
          { type: 'touchend', handler: touchEndHandler, element, options },
          { type: 'touchcancel', handler: touchEndHandler, element, options }
        );
      } catch (error) {
        this._debug('Failed to add touch rotation handlers:', error.message);
      }
    }
  }

  /**
   * Sets up pinch zoom event handlers
   * @private
   */
  _setupPinchZoomEvents(element, callback, options, listenerId, listenerInfo) {
    const state = listenerInfo.state.pinchzoom;
    const hasTouchEvents = this.features.touch;
    const pinchZoomStep = options.pinchZoomStep;
    const touchFingerDistance = this.defaults.touchFingerDistance;
    
    // Wheel event handler (Ctrl+Alt+wheel)
    const wheelHandler = (event) => {
      // Only handle Ctrl+Alt+wheel for pinchzoom
      if (!(event.ctrlKey && event.altKey)) return;
      
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      // Calculate zoom factor based on wheel delta
      const delta = event.deltaY || event.detail || event.wheelDelta;
      const zoomDelta = delta > 0 ? (1 - pinchZoomStep) : (1 + pinchZoomStep);
      
      // Update scale value
      state.scale *= zoomDelta;
      
      // Limit scale to min/max values
      state.scale = Math.max(
        this.defaults.minScale, 
        Math.min(this.defaults.maxScale, state.scale)
      );
      
      // Create pinchzoom event data
      const additionalData = {
        scale: state.scale,
        deltaScale: zoomDelta,
        center: {
          x: event.clientX,
          y: event.clientY
        },
        source: 'mouse',
        isWheel: true
      };
      
      this._debug(`Mouse pinchzoom: scale=${state.scale.toFixed(2)}, delta=${zoomDelta.toFixed(2)}`);
      callback(this._createUnifiedEvent(event, 'pinchzoom', additionalData));
    };
    
    // Touch start handler
    const touchStartHandler = (event) => {
      // Need exactly two touches for pinchzoom
      if (event.touches.length !== 2) return;
      
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      
      // Calculate distance between touches
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Ensure touches are far enough apart
      if (distance < touchFingerDistance) {
        return;
      }
      
      // Initialize pinchzoom tracking
      state.active = true;
      state.touch1 = {
        id: touch1.identifier,
        startX: touch1.clientX,
        startY: touch1.clientY,
        currentX: touch1.clientX,
        currentY: touch1.clientY
      };
      
      state.touch2 = {
        id: touch2.identifier,
        startX: touch2.clientX,
        startY: touch2.clientY,
        currentX: touch2.clientX,
        currentY: touch2.clientY
      };
      
      // Calculate center point
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      // Store initial distance
      state.initialDistance = distance;
      state.lastDistance = distance;
      state.totalScale = 1.0;
      
      this._debug(`Touch pinchzoom start: initial distance=${distance.toFixed(2)}px, center=(${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);
    };
    
    // Touch move handler
    const touchMoveHandler = (event) => {
      if (!state.active || event.touches.length !== 2) return;
      
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      // Identify touches using stored IDs
      let touch1, touch2;
      const t1 = event.touches[0];
      const t2 = event.touches[1];
      
      // Match touches to our stored touch IDs
      if (t1.identifier === state.touch1.id && 
          t2.identifier === state.touch2.id) {
        touch1 = t1;
        touch2 = t2;
      } else if (t1.identifier === state.touch2.id && 
                t2.identifier === state.touch1.id) {
        touch1 = t2;
        touch2 = t1;
      } else {
        // Touch IDs don't match tracked touches
        return;
      }
      
      // Update current positions
      state.touch1.currentX = touch1.clientX;
      state.touch1.currentY = touch1.clientY;
      state.touch2.currentX = touch2.clientX;
      state.touch2.currentY = touch2.clientY;
      
      // Calculate center point
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      // Calculate current distance
      const dx = touch2.clientX - touch1.clientX;
      const dy = touch2.clientY - touch1.clientY;
      const currentDistance = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate scale factor
      const scaleFactor = currentDistance / state.lastDistance;
      
      // Filter out extreme changes that might be due to touch detection errors
      if (scaleFactor < 0.5 || scaleFactor > 2.0) {
        state.lastDistance = currentDistance;
        return;
      }
      
      // Update total scale
      state.totalScale *= scaleFactor;
      
      // Limit scale to min/max values
      state.totalScale = Math.max(
        this.defaults.minScale, 
        Math.min(this.defaults.maxScale, state.totalScale)
      );
      
      // Update last distance
      state.lastDistance = currentDistance;
      
      // Create pinchzoom event data
      const additionalData = {
        scale: state.totalScale,
        deltaScale: scaleFactor,
        initialDistance: state.initialDistance,
        currentDistance: currentDistance,
        center: {
          x: centerX,
          y: centerY
        },
        source: 'touch',
        touches: [
          { x: touch1.clientX, y: touch1.clientY, id: touch1.identifier },
          { x: touch2.clientX, y: touch2.clientY, id: touch2.identifier }
        ]
      };
      
      this._debug(`Touch pinchzoom: scale=${state.totalScale.toFixed(2)}, delta=${scaleFactor.toFixed(2)}, distance=${currentDistance.toFixed(2)}px`);
      callback(this._createUnifiedEvent(event, 'pinchzoom', additionalData));
    };
    
    // Touch end handler
    const touchEndHandler = (event) => {
      if (!state.active) return;
      
      // End pinchzoom when fewer than 2 touches remain
      if (event.touches.length < 2) {
        state.active = false;
        this._debug('Touch pinchzoom ended: touch lost');
      }
    };
    
    // Register wheel event for mouse pinchzoom
    try {
      element.addEventListener('wheel', wheelHandler, options);
      listenerInfo.nativeListeners.push({
        type: 'wheel',
        handler: wheelHandler,
        element,
        options
      });
    } catch (error) {
      this._debug('Failed to add wheel handler:', error.message);
    }
    
    // Register touch pinchzoom handlers
    if (hasTouchEvents) {
      try {
        element.addEventListener('touchstart', touchStartHandler, options);
        element.addEventListener('touchmove', touchMoveHandler, options);
        element.addEventListener('touchend', touchEndHandler, options);
        element.addEventListener('touchcancel', touchEndHandler, options);
        
        listenerInfo.nativeListeners.push(
          { type: 'touchstart', handler: touchStartHandler, element, options },
          { type: 'touchmove', handler: touchMoveHandler, element, options },
          { type: 'touchend', handler: touchEndHandler, element, options },
          { type: 'touchcancel', handler: touchEndHandler, element, options }
        );
      } catch (error) {
        this._debug('Failed to add touch pinchzoom handlers:', error.message);
      }
    }
  }

  /**
   * Sets up drag events
   * @private
   */
  _setupDragEvents(element, eventType, callback, options, listenerId, listenerInfo) {
    // Validate and merge options
    const mergedOptions = {
      preventDefault: !!options.preventDefault,
      range: this._validateRangeConstraints(options.range),
      keepState: options.keepState !== false,
      usePointerCapture: options.usePointerCapture !== undefined 
        ? options.usePointerCapture 
        : this.defaults.usePointerCapture,
      throttleMs: options.throttle || this.defaults.throttleMs
    };
    
    // Initialize state
    const state = listenerInfo.state;
    state.drag = state.drag || {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      range: mergedOptions.range,
      keepState: mergedOptions.keepState,
      usePointerCapture: mergedOptions.usePointerCapture,
      capturedPointer: null,
      elementRect: null,
      cumulativeDelta: { x: 0, y: 0 },
      currentDeltaX: 0,
      currentDeltaY: 0,
      lastMoveTime: 0,
      inertiaAnimation: null
    };
    
    // Set up event handlers based on type
    if (eventType === 'dragstart') {
      this._setupDragStartEvents(element, callback, mergedOptions, listenerId, listenerInfo);
    } 
    else if (eventType === 'drag') {
      this._setupDragMoveEvents(element, callback, mergedOptions, listenerId, listenerInfo);
    } 
    else if (eventType === 'dragend') {
      this._setupDragEndEvents(element, callback, mergedOptions, listenerId, listenerInfo);
    }
  }

  /**
   * Validates range constraints for drag
   * @private
   * @param {Object} range - Range object to validate
   * @returns {Object|null} Validated range object or null
   */
  _validateRangeConstraints(range) {
    if (!range) return null;
    
    const validatedRange = {};
    
    // Validate X range
    if (range.x) {
      if (Array.isArray(range.x) && range.x.length === 2 && 
          typeof range.x[0] === 'number' && typeof range.x[1] === 'number') {
        validatedRange.x = range.x;
      } else {
        this._debug('Invalid X range specified, ignoring');
      }
    }
    
    // Validate Y range
    if (range.y) {
      if (Array.isArray(range.y) && range.y.length === 2 && 
          typeof range.y[0] === 'number' && typeof range.y[1] === 'number') {
        validatedRange.y = range.y;
      } else {
        this._debug('Invalid Y range specified, ignoring');
      }
    }
    
    return Object.keys(validatedRange).length > 0 ? validatedRange : null;
  }

  /**
   * Sets up drag start events
   * @private
   */
  _setupDragStartEvents(element, callback, options, listenerId, listenerInfo) {
    const state = listenerInfo.state.drag;
    const hasPointerEvents = this.features.pointerEvents;
    
    // Drag start handler
    const dragStartHandler = (event) => {
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // Ignore if already tracking same pointer
      if (state.active && state.capturedPointer === pointerId) {
        return;
      }
      
      // Store element rect for relative position calculations
      try {
        state.elementRect = element.getBoundingClientRect();
      } catch (e) {
        this._debug('Failed to get element rect:', e.message);
        state.elementRect = { left: 0, top: 0, width: 0, height: 0 };
      }
      
      // Initialize drag session
      state.active = true;
      state.startX = clientX;
      state.startY = clientY;
      state.currentX = clientX;
      state.currentY = clientY;
      state.capturedPointer = pointerId;
      state.currentDeltaX = 0;
      state.currentDeltaY = 0;
      state.lastMoveTime = Date.now();
      
      // Stop any ongoing inertia animation
      if (state.inertiaAnimation) {
        cancelAnimationFrame(state.inertiaAnimation);
        state.inertiaAnimation = null;
      }
      
      // Set pointer capture if supported
      if (state.usePointerCapture && this.features.pointerCapture && pointerId !== undefined) {
        this._debug(`Setting pointer capture for drag: pointerId=${pointerId}`);
        try {
          element.setPointerCapture(pointerId);
        } catch (e) {
          this._debug('Failed to set pointer capture:', e.message);
        }
      }
      
      // Create drag start event data
      const additionalData = {
        startX: state.startX,
        startY: state.startY,
        deltaX: state.cumulativeDelta.x,
        deltaY: state.cumulativeDelta.y,
        elementRect: state.elementRect
      };
      
      // Trigger dragstart event
      this._debug(`Drag start: X=${state.startX}, Y=${state.startY}`);
      callback(this._createUnifiedEvent(event, 'dragstart', additionalData));
    };
    
    // Register event listeners
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [{ type: 'start', handler: dragStartHandler }], 
      options, 
      listenerInfo
    );
  }

  /**
   * Sets up drag move events
   * @private
   */
  _setupDragMoveEvents(element, callback, options, listenerId, listenerInfo) {
    const state = listenerInfo.state.drag;
    const hasPointerEvents = this.features.pointerEvents;
    const throttleMs = options.throttleMs;
    
    // Initialize cumulative delta if needed
    if (!state.cumulativeDelta) {
      state.cumulativeDelta = { x: 0, y: 0 };
    }
    
    // Drag start handler
    const dragStartHandler = (event) => {
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // Ignore if already tracking same pointer
      if (state.active && state.capturedPointer === pointerId) {
        return;
      }
      
      // Store element rect for relative position calculations
      try {
        state.elementRect = element.getBoundingClientRect();
      } catch (e) {
        this._debug('Failed to get element rect:', e.message);
        state.elementRect = { left: 0, top: 0, width: 0, height: 0 };
      }
      
      // Initialize drag session
      state.active = true;
      state.startX = clientX;
      state.startY = clientY;
      state.currentX = clientX;
      state.currentY = clientY;
      state.capturedPointer = pointerId;
      state.currentDeltaX = 0;
      state.currentDeltaY = 0;
      state.lastMoveTime = Date.now();
      
      // Stop any ongoing inertia animation
      if (state.inertiaAnimation) {
        cancelAnimationFrame(state.inertiaAnimation);
        state.inertiaAnimation = null;
      }
      
      // Set pointer capture if supported
      if (state.usePointerCapture && this.features.pointerCapture && pointerId !== undefined) {
        this._debug(`Setting pointer capture for drag: pointerId=${pointerId}`);
        try {
          element.setPointerCapture(pointerId);
        } catch (e) {
          this._debug('Failed to set pointer capture:', e.message);
        }
      }
      
      // Create drag start event data
      const additionalData = {
        startX: state.startX,
        startY: state.startY,
        deltaX: state.cumulativeDelta.x,
        deltaY: state.cumulativeDelta.y,
        elementRect: state.elementRect
      };
      
      // Trigger internal dragstart event
      this._debug(`Drag start (from move handler): X=${state.startX}, Y=${state.startY}`);
      
      // Check for existing dragstart listeners
      let hasDragStartCallback = false;
      this.eventListeners.forEach((info, id) => {
        if (info.element === element && info.eventType === 'dragstart') {
          // Create unified event for dragstart
          const dragStartEvent = this._createUnifiedEvent(event, 'dragstart', additionalData);
          info.callback(dragStartEvent);
          hasDragStartCallback = true;
        }
      });
      
      // Log if no dragstart listeners found
      if (!hasDragStartCallback) {
        this._debug('No dragstart listeners found for this element');
      }
    };
    
    // Drag move handler
    const dragMoveHandler = (event) => {
      if (!state.active) return;
      
      const pointerId = event.pointerId || (event.touches && event.touches[0] ? event.touches[0].identifier : 1);
      
      // Ignore events from other pointers
      if (state.capturedPointer !== pointerId) {
        return;
      }
      
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      // Apply throttling
      const now = Date.now();
      if (throttleMs > 0 && now - state.lastMoveTime < throttleMs) {
        return; // Skip processing for better performance
      }
      state.lastMoveTime = now;
      
      const clientX = event.clientX || (event.touches && event.touches[0] ? event.touches[0].clientX : 0);
      const clientY = event.clientY || (event.touches && event.touches[0] ? event.touches[0].clientY : 0);
      
      // Update current position
      state.currentX = clientX;
      state.currentY = clientY;
      
      // Calculate deltas
      state.currentDeltaX = clientX - state.startX;
      state.currentDeltaY = clientY - state.startY;
      
      // Calculate total delta (cumulative + current)
      const totalDeltaX = state.cumulativeDelta.x + state.currentDeltaX;
      const totalDeltaY = state.cumulativeDelta.y + state.currentDeltaY;
      
      // Apply range constraints
      let constrainedDeltaX = totalDeltaX;
      let constrainedDeltaY = totalDeltaY;
      let isOutOfBounds = false;
      let isOutOfBoundsX = false;
      let isOutOfBoundsY = false;
      
      // Check range constraints
      if (state.range) {
        if (state.range.x) {
          const [minX, maxX] = state.range.x;
          if (totalDeltaX < minX) {
            constrainedDeltaX = minX;
            isOutOfBounds = true;
            isOutOfBoundsX = true;
          } else if (totalDeltaX > maxX) {
            constrainedDeltaX = maxX;
            isOutOfBounds = true;
            isOutOfBoundsX = true;
          }
        }
        
        if (state.range.y) {
          const [minY, maxY] = state.range.y;
          if (totalDeltaY < minY) {
            constrainedDeltaY = minY;
            isOutOfBounds = true;
            isOutOfBoundsY = true;
          } else if (totalDeltaY > maxY) {
            constrainedDeltaY = maxY;
            isOutOfBounds = true;
            isOutOfBoundsY = true;
          }
        }
      }
      
      // Create drag event data
      const additionalData = {
        startX: state.startX,
        startY: state.startY,
        currentX: state.currentX,
        currentY: state.currentY,
        deltaX: totalDeltaX,
        deltaY: totalDeltaY,
        constrainedDeltaX,
        constrainedDeltaY,
        currentDeltaX: state.currentDeltaX,
        currentDeltaY: state.currentDeltaY,
        isOutOfBounds,
        isOutOfBoundsX,
        isOutOfBoundsY,
        elementRect: state.elementRect
      };
      
      // Trigger drag event
      callback(this._createUnifiedEvent(event, 'drag', additionalData));
    };
    
    // Drag end handler
    const dragEndHandler = (event) => {
      if (!state.active) return;
      
      const pointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // Ignore events from other pointers
      if (state.capturedPointer !== pointerId) {
        return;
      }
      
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      // Update cumulative delta if keeping state
      if (options.keepState) {
        // Add current session delta to cumulative delta
        state.cumulativeDelta.x += state.currentDeltaX;
        state.cumulativeDelta.y += state.currentDeltaY;
        
        // Apply range constraints to cumulative delta
        if (state.range) {
          if (state.range.x) {
            const [minX, maxX] = state.range.x;
            state.cumulativeDelta.x = Math.max(minX, Math.min(maxX, state.cumulativeDelta.x));
          }
          
          if (state.range.y) {
            const [minY, maxY] = state.range.y;
            state.cumulativeDelta.y = Math.max(minY, Math.min(maxY, state.cumulativeDelta.y));
          }
        }
      } else {
        // Reset cumulative delta if not keeping state
        state.cumulativeDelta = { x: 0, y: 0 };
      }
      
      // Create dragend event
      const dragEndEvent = this._createUnifiedEvent(event, 'dragend', {
        startX: state.startX,
        startY: state.startY,
        endX: state.currentX,
        endY: state.currentY,
        deltaX: state.cumulativeDelta.x,
        deltaY: state.cumulativeDelta.y,
        currentDeltaX: state.currentDeltaX,
        currentDeltaY: state.currentDeltaY,
        duration: Date.now() - state.lastMoveTime,
        isOutOfBounds: false,
        elementRect: state.elementRect
      });
      
      // Check for existing dragend listeners
      let hasEndCallback = false;
      this.eventListeners.forEach((info, id) => {
        if (info.element === element && info.eventType === 'dragend') {
          info.callback(dragEndEvent);
          hasEndCallback = true;
        }
      });
      
      // Reset active state
      state.active = false;
      state.capturedPointer = null;
      
      // Release pointer capture
      if (state.usePointerCapture && this.features.pointerCapture) {
        try {
          element.releasePointerCapture(pointerId);
        } catch (e) {
          this._debug('Failed to release pointer capture:', e.message);
        }
      }
    };
    
    // Drag cancel handler
    const dragCancelHandler = (event) => {
      if (!state.active) return;
      
      const pointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // Ignore events from other pointers
      if (state.capturedPointer !== pointerId) {
        return;
      }
      
      // Release pointer capture
      if (state.usePointerCapture && this.features.pointerCapture) {
        try {
          element.releasePointerCapture(pointerId);
        } catch (e) {
          this._debug('Failed to release pointer capture:', e.message);
        }
      }
      
      // Reset state (keep cumulative delta)
      state.active = false;
      state.capturedPointer = null;
      
      this._debug('Drag canceled');
    };
    
    // Register event listeners
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [
        { type: 'start', handler: dragStartHandler },
        { type: 'move', handler: dragMoveHandler },
        { type: 'end', handler: dragEndHandler },
        { type: 'cancel', handler: dragCancelHandler }
      ], 
      options, 
      listenerInfo
    );
    
    // Add pointerleave handler for pointer events
    if (hasPointerEvents) {
      try {
        element.addEventListener('pointerleave', dragCancelHandler, options);
        listenerInfo.nativeListeners.push({
          type: 'pointerleave',
          handler: dragCancelHandler,
          element,
          options
        });
      } catch (error) {
        this._debug('Failed to add pointerleave handler:', error.message);
      }
    }
  }

  /**
   * Sets up drag end events
   * @private
   */
  _setupDragEndEvents(element, callback, options, listenerId, listenerInfo) {
    // We need to register an actual dragend handler for cases where users register
    // only dragend listeners without drag/dragstart
    const state = listenerInfo.state.drag;
    const hasPointerEvents = this.features.pointerEvents;
    
    // Initialize state if needed
    if (!state) {
      listenerInfo.state.drag = {
        active: false,
        capturedPointer: null,
        cumulativeDelta: { x: 0, y: 0 },
        usePointerCapture: options.usePointerCapture !== undefined 
          ? options.usePointerCapture 
          : this.defaults.usePointerCapture
      };
    }
    
    // Drag end handler for standalone dragend listeners
    const dragEndHandler = (event) => {
      const pointerId = event.pointerId || (event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].identifier : 1);
      
      // Get current element rect
      let elementRect;
      try {
        elementRect = element.getBoundingClientRect();
      } catch (e) {
        this._debug('Failed to get element rect:', e.message);
        elementRect = { left: 0, top: 0, width: 0, height: 0 };
      }
      
      if (options.preventDefault) {
        try {
          event.preventDefault();
        } catch (e) {
          this._debug('preventDefault failed:', e.message);
        }
      }
      
      // Create dragend event with limited info
      const dragEndEvent = this._createUnifiedEvent(event, 'dragend', {
        deltaX: state.cumulativeDelta?.x || 0,
        deltaY: state.cumulativeDelta?.y || 0,
        elementRect: elementRect
      });
      
      callback(dragEndEvent);
    };
    
    // Register event listeners
    this._registerEventListeners(
      element, 
      hasPointerEvents, 
      [{ type: 'end', handler: dragEndHandler }], 
      options, 
      listenerInfo
    );
  }

  /**
   * Sets pointer capture
   * @private
   * @param {HTMLElement} element - Element to capture pointer
   * @param {number} pointerId - Pointer identifier
   * @param {Object} event - Unified event object
   * @returns {boolean} Success status
   */
  _setPointerCapture(element, pointerId, event) {
    if (!element || !pointerId) {
      this._debug('Invalid element or pointerId for capture');
      return false;
    }
    
    // Check if pointer capture is supported
    if (!this.features.pointerCapture) {
      this._debug('Pointer capture not supported in this browser');
      return false;
    }
    
    try {
      // Check if setPointerCapture method exists
      if (typeof element.setPointerCapture === 'function') {
        element.setPointerCapture(pointerId);
        this._debug(`Pointer capture set: pointerId=${pointerId}, element=${element.tagName || 'element'}`);
        return true;
      } else {
        this._debug('setPointerCapture method not available on element');
      }
    } catch (e) {
      this._debug('Failed to set pointer capture:', e.message);
    }
    
    return false;
  }
  
  /**
   * Releases pointer capture
   * @private
   * @param {HTMLElement} element - Element with captured pointer
   * @param {number} pointerId - Pointer identifier
   * @param {Object} event - Unified event object
   * @returns {boolean} Success status
   */
  _releasePointerCapture(element, pointerId, event) {
    if (!element || !pointerId) {
      this._debug('Invalid element or pointerId for release');
      return false;
    }
    
    // Check if pointer capture is supported
    if (!this.features.pointerCapture) {
      this._debug('Pointer capture not supported in this browser');
      return false;
    }
    
    try {
      // Check if releasePointerCapture method exists
      if (typeof element.releasePointerCapture === 'function') {
        element.releasePointerCapture(pointerId);
        this._debug(`Pointer capture released: pointerId=${pointerId}, element=${element.tagName || 'element'}`);
        return true;
      } else {
        this._debug('releasePointerCapture method not available on element');
      }
    } catch (e) {
      this._debug('Failed to release pointer capture:', e.message);
    }
    
    return false;
  }

  /**
   * Tracks touch ID
   * @private
   * @param {number} touchId - Touch identifier
   * @param {Object} touchInfo - Touch information
   */
  _trackTouch(touchId, touchInfo) {
    if (touchId === undefined || touchId === null) {
      this._debug('Invalid touchId for tracking');
      return;
    }
    
    // Store touch info with timestamp
    this._activeTouches.set(touchId, { 
      ...touchInfo, 
      timestamp: Date.now() 
    });
    
    this._debug(`Touch tracked: ID=${touchId}, count=${this._activeTouches.size}`);
  }
  
  /**
   * Stops tracking touch
   * @private
   * @param {number} touchId - Touch identifier
   */
  _untrackTouch(touchId) {
    if (touchId === undefined || touchId === null) {
      this._debug('Invalid touchId for untracking');
      return;
    }
    
    // Check if touch is being tracked
    if (!this._activeTouches.has(touchId)) {
      this._debug(`Touch ID ${touchId} not found for untracking`);
      return;
    }
    
    this._activeTouches.delete(touchId);
    this._debug(`Touch untracked: ID=${touchId}, remaining=${this._activeTouches.size}`);
  }
  
  /**
   * Gets active touch count
   * @private
   * @returns {number} Active touch count
   */
  _getActiveTouchCount() {
    return this._activeTouches.size;
  }
  
  /**
   * Gets information about an active touch
   * @private
   * @param {number} touchId - Touch identifier
   * @returns {Object|null} Touch information or null if not found
   */
  _getTouchInfo(touchId) {
    if (touchId === undefined || touchId === null) {
      return null;
    }
    
    return this._activeTouches.get(touchId) || null;
  }
  
  /**
   * Removes stale touches (touches that haven't been updated recently)
   * @private
   * @param {number} olderThanMs - Remove touches older than this many milliseconds
   * @returns {number} Number of touches removed
   */
  _clearStaleTouches(olderThanMs = 5000) {
    const now = Date.now();
    let removed = 0;
    
    this._activeTouches.forEach((info, id) => {
      if (now - info.timestamp > olderThanMs) {
        this._activeTouches.delete(id);
        removed++;
      }
    });
    
    if (removed > 0) {
      this._debug(`Cleared ${removed} stale touches`);
    }
    
    return removed;
  }

  /**
   * Removes a unified pointer event listener
   * @param {string} listenerId - Listener ID returned by addEventListener
   * @returns {boolean} Whether removal was successful
   */
  removeEventListener(listenerId) {
    // Check if listener exists
    const listenerInfo = this.eventListeners.get(listenerId);
    if (!listenerInfo) {
      this._debug(`Failed to remove listener: ID ${listenerId} not found.`);
      return false;
    }

    try {
      // Remove native event listeners
      this._debug(`Starting listener removal: ID=${listenerId}, type=${listenerInfo.eventType}, element=${listenerInfo.element?.tagName || 'element'}`);
      
      // Process each native listener
      if (Array.isArray(listenerInfo.nativeListeners)) {
        listenerInfo.nativeListeners.forEach(({ type, handler, element, options }) => {
          if (element && typeof element.removeEventListener === 'function') {
            try {
              // Check if handler is defined
              if (typeof handler === 'function') {
                // Remove event listener
                element.removeEventListener(type, handler, options || {});
                this._debug(`- Native listener removed: element=${element.tagName || 'element'}, type=${type}`);
              } else {
                this._debug(`- Handler function missing: element=${element.tagName || 'element'}, type=${type}`);
              }
            } catch (removeError) {
              this._debug(`- Error removing native listener: ${removeError.message}`);
            }
          } else {
            this._debug(`- Invalid element or removeEventListener method missing`);
          }
        });
      } else {
        this._debug(`- nativeListeners array not found`);
      }

      // Clean up state based on event type
      const state = listenerInfo.state;
      if (state) {
        // Clear any timers
        if (state.timerId) {
          clearTimeout(state.timerId);
          state.timerId = null;
        }
        
        // Cancel any animations
        if (state.inertiaAnimation) {
          cancelAnimationFrame(state.inertiaAnimation);
          state.inertiaAnimation = null;
        }
        
        // Handle drag state
        if (state.drag) {
          if (state.drag.inertiaAnimation) {
            cancelAnimationFrame(state.drag.inertiaAnimation);
            state.drag.inertiaAnimation = null;
          }
          
          // Release pointer capture for drag
          if (state.drag.capturedPointer && 
              listenerInfo.element && 
              this.features.pointerCapture) {
            try {
              listenerInfo.element.releasePointerCapture(state.drag.capturedPointer);
              this._debug(`- Released captured pointer from drag: ID=${state.drag.capturedPointer}`);
            } catch (e) {
              this._debug(`- Failed to release drag pointer capture: ${e.message}`);
            }
          }
        }
        
        // Clean up gesture states
        ['longclick', 'doubleclick', 'swipe', 'fling', 'rotate', 'pinchzoom'].forEach(gestureType => {
          if (state[gestureType]) {
            // Clear gesture timers
            if (state[gestureType].timerId) {
              clearTimeout(state[gestureType].timerId);
              state[gestureType].timerId = null;
            }
            
            // Release pointer capture for gesture
            if (state[gestureType].pointerId && 
                listenerInfo.element && 
                this.features.pointerCapture) {
              try {
                listenerInfo.element.releasePointerCapture(state[gestureType].pointerId);
                this._debug(`- Released captured pointer from ${gestureType}: ID=${state[gestureType].pointerId}`);
              } catch (e) {
                this._debug(`- Failed to release ${gestureType} pointer capture: ${e.message}`);
              }
            }
          }
        });
      }
      
      // Remove from listener map
      this.eventListeners.delete(listenerId);
      
      this._debug(`Listener removal complete: ID=${listenerId}`);
      return true;
    } catch (error) {
      this._debug(`Error during listener removal: ID=${listenerId}, error=${error.message}`);
      // Try to remove from map even if error occurred
      try {
        this.eventListeners.delete(listenerId);
      } catch (cleanupError) {
        this._debug(`- Additional error during cleanup: ${cleanupError.message}`);
      }
      return false;
    }
  }

  /**
   * Removes all event listeners from an element
   * @param {HTMLElement} element - Element to remove listeners from
   * @returns {number} Number of listeners removed
   */
  removeAllEventListeners(element) {
    if (!element) {
      this._debug('Cannot remove listeners from null/undefined element');
      return 0;
    }
    
    // Collect listener IDs to remove
    const listenerIdsToRemove = [];
    
    this.eventListeners.forEach((listenerInfo, listenerId) => {
      if (listenerInfo.element === element) {
        listenerIdsToRemove.push(listenerId);
      }
    });
    
    // Log collected IDs
    this._debug(`Starting removal of all listeners: element=${element.tagName || 'element'}, ID count=${listenerIdsToRemove.length}`);
    
    // Try direct native event listener removal (forced cleanup)
    try {
      // List of all possible event types we might have registered
      const allPossibleEvents = [
        'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'pointerleave',
        'pointerover', 'pointerout', 'pointerenter', 'pointerleave',
        'gotpointercapture', 'lostpointercapture',
        'mousedown', 'mousemove', 'mouseup', 'mouseleave', 'mouseenter',
        'mouseover', 'mouseout', 'click', 'dblclick',
        'touchstart', 'touchmove', 'touchend', 'touchcancel',
        'wheel', 'contextmenu'
      ];
      
      // Get all existing handlers and try to remove them
      const handlersToRemove = new Set();
      
      // Collect all handlers first
      this.eventListeners.forEach((info, id) => {
        if (info.element === element && Array.isArray(info.nativeListeners)) {
          info.nativeListeners.forEach(({ type, handler }) => {
            if (typeof handler === 'function') {
              handlersToRemove.add({type, handler});
            }
          });
        }
      });
      
      // Then remove them
      handlersToRemove.forEach(({type, handler}) => {
        try {
          element.removeEventListener(type, handler, false);
          element.removeEventListener(type, handler, true);
          this._debug(`- Direct native listener removal: type=${type}`);
        } catch (err) {
          this._debug(`- Error during direct removal: ${err.message}`);
        }
      });
      
      // Also try to remove listeners for all possible events with empty handlers
      // This is a last-resort cleanup that might help in some edge cases
      if (listenerIdsToRemove.length > 0) {
        const emptyHandler = () => {};
        allPossibleEvents.forEach(eventType => {
          try {
            element.removeEventListener(eventType, emptyHandler, false);
            element.removeEventListener(eventType, emptyHandler, true);
          } catch (err) {
            // Ignore errors for the empty handler removal
          }
        });
      }
    } catch (err) {
      this._debug(`Error during direct listener removal: ${err.message}`);
    }
    
    // Remove collected listeners using our standard method
    let successCount = 0;
    for (const id of listenerIdsToRemove) {
      if (this.removeEventListener(id)) {
        successCount++;
      }
    }
    
    // Check for any remaining listeners that might have been missed
    let remainingCount = 0;
    this.eventListeners.forEach((info, id) => {
      if (info.element === element) {
        remainingCount++;
      }
    });
    
    if (remainingCount > 0) {
      this._debug(`Warning: ${remainingCount} listeners still attached to element after cleanup`);
    }
    
    this._debug(`All element listeners removed: element=${element.tagName || 'element'}, success=${successCount}/${listenerIdsToRemove.length}`);
    return successCount;
  }

  /**
   * Disposes all resources and removes all event listeners
   */
  dispose() {
    this._debug('Starting complete library disposal');
    
    // Create a copy of listener IDs to avoid modification during iteration
    const listenerIds = Array.from(this.eventListeners.keys());
    
    // Remove all listeners one by one
    let successCount = 0;
    let failureCount = 0;
    
    for (const id of listenerIds) {
      try {
        if (this.removeEventListener(id)) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        this._debug(`Error removing listener ${id} during dispose: ${error.message}`);
        failureCount++;
      }
    }
    
    // Final cleanup of any remaining listeners
    try {
      this.eventListeners.forEach((listenerInfo, id) => {
        // Try to cleanup any remaining native listeners directly
        if (listenerInfo.element && Array.isArray(listenerInfo.nativeListeners)) {
          listenerInfo.nativeListeners.forEach(({ type, handler, element, options }) => {
            if (element && typeof handler === 'function') {
              try {
                element.removeEventListener(type, handler, options || {});
              } catch (e) {
                // Ignore errors in final cleanup
              }
            }
          });
        }
      });
      
      // Clear all maps and collections
      this.eventListeners.clear();
      this._activeTouches.clear();
      
      // Cleanup any other resources
      this.listenerCounter = 0;
    } catch (error) {
      this._debug(`Error during final cleanup: ${error.message}`);
    }
    
    this._debug(`Disposal complete: ${successCount} listeners removed successfully, ${failureCount} failures`);
  }
  
  /**
   * Gets the number of active listeners
   * @returns {number} Number of active listeners
   */
  getActiveListenerCount() {
    return this.eventListeners.size;
  }
  
  /**
   * Sets debug mode
   * @param {boolean} enabled - Whether to enable debug mode
   * @returns {UnifiedPointerEvents} This instance for chaining
   */
  setDebugMode(enabled) {
    this.debugMode = !!enabled;
    this._debug(`Debug mode ${enabled ? 'enabled' : 'disabled'}`);
    return this;
  }
  
  /**
   * Gets a list of all registered event listeners
   * @returns {Array} Array of listener info objects
   */
  getRegisteredListeners() {
    const listeners = [];
    this.eventListeners.forEach((info, id) => {
      listeners.push({
        id,
        element: info.element?.tagName || 'element',
        eventType: info.eventType,
        options: { ...info.options }, // Clone options to avoid external modification
        registrationTime: info.registrationTime
      });
    });
    return listeners;
  }
  
  /**
   * Removes all event listeners from an element
   * @param {HTMLElement} element - Target element
   * @returns {number} Number of listeners removed
   */
  cleanupElementListeners(element) {
    return this.removeAllEventListeners(element);
  }
  
  /**
   * Gets detailed status information about the library
   * @returns {Object} Status information
   */
  getStatus() {
    // Count listeners by type
    const listenersByType = {};
    this.eventListeners.forEach(info => {
      const type = info.eventType;
      listenersByType[type] = (listenersByType[type] || 0) + 1;
    });
    
    // Collect browser capabilities
    const capabilities = { ...this.features };
    
    return {
      version: '1.4.0',
      listenerCount: this.eventListeners.size,
      activeTouchCount: this._activeTouches.size,
      listenersByType,
      browserCapabilities: capabilities,
      memoryUsage: this._getMemoryUsage()
    };
  }
  
  /**
   * Estimates memory usage of the library
   * @private
   * @returns {Object} Memory usage information
   */
  _getMemoryUsage() {
    // This is a very rough estimate
    return {
      listeners: this.eventListeners.size,
      touchTracking: this._activeTouches.size,
      // Each listener might consume roughly 2-5KB of memory with handler functions and state
      estimatedBytes: this.eventListeners.size * 3000 + this._activeTouches.size * 500
    };
  }

  /**
   * Utility method to normalize an angle to 0-360 degree range
   * @param {number} angle - Angle in degrees
   * @returns {number} Normalized angle (0-360)
   */
  normalizeAngle(angle) {
    let normalized = angle % 360;
    if (normalized < 0) {
      normalized += 360;
    }
    return normalized;
  }
  
  /**
   * Utility method to calculate distance between two points
   * @param {number} x1 - First point X coordinate
   * @param {number} y1 - First point Y coordinate
   * @param {number} x2 - Second point X coordinate
   * @param {number} y2 - Second point Y coordinate
   * @returns {number} Distance between the points
   */
  calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Utility method to determine if a point is inside an element
   * @param {number} x - Point X coordinate
   * @param {number} y - Point Y coordinate
   * @param {HTMLElement} element - Element to check
   * @returns {boolean} Whether the point is inside the element
   */
  isPointInElement(x, y, element) {
    if (!element) return false;
    
    try {
      const rect = element.getBoundingClientRect();
      return (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      );
    } catch (e) {
      this._debug('Error checking if point is in element:', e.message);
      return false;
    }
  }
  
  /**
   * Utility method to throttle a function call
   * @param {Function} fn - Function to throttle
   * @param {number} limit - Time limit in ms
   * @returns {Function} Throttled function
   */
  throttle(fn, limit = 16) {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        return fn.apply(this, args);
      }
    };
  }
  
  /**
   * Detects device type based on user agent and features
   * @returns {Object} Device information
   */
  detectDevice() {
    const ua = navigator.userAgent;
    const platform = navigator.platform;
    
    // Device type detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isTablet = /(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua);
    const isDesktop = !isMobile && !isTablet;
    
    // OS detection
    const isIOS = /iPad|iPhone|iPod/.test(platform) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const isWindows = /Win/.test(platform);
    const isMacOS = /Mac/.test(platform) && !isIOS;
    const isLinux = /Linux/.test(platform) && !isAndroid;
    
    return {
      isMobile,
      isTablet,
      isDesktop,
      isIOS,
      isAndroid,
      isWindows,
      isMacOS,
      isLinux,
      supportsTouchEvents: this.features.touch,
      supportsPointerEvents: this.features.pointerEvents,
      supportsMouseEvents: this.features.mouse
    };
  }
}

// Create single instance and export
const unifiedPointerEvents = new UnifiedPointerEvents();

// Set up automatic cleanup on page unload to prevent memory leaks
if (typeof window !== 'undefined') {
  window.addEventListener('unload', () => {
    unifiedPointerEvents.dispose();
  });
  
  // Warning for older API users accessing via deprecated method names
  // This provides backward compatibility with earlier versions
  if (typeof window.PointerEvents === 'undefined') {
    window.PointerEvents = {
      get instance() {
        console.warn('PointerEvents.instance is deprecated, use unifiedPointerEvents instead');
        return unifiedPointerEvents;
      }
    };
  }
}

// Export module
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = unifiedPointerEvents;
} else if (typeof window !== 'undefined') {
  window.unifiedPointerEvents = unifiedPointerEvents;
}