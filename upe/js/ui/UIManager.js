// path : js/ui/UIManager.js

/**
 * UI 관리 모듈
 * 사용자 인터페이스 생성 및 관리를 담당합니다.
 */
import HomePage from './pages/HomePage.js';
import BasicPage from './pages/BasicPage.js';
import GesturePage from './pages/GesturePage.js';
import DragPage from './pages/DragPage.js';
import DrawPage from './pages/DrawPage.js';
import CapturePage from './pages/CapturePage.js';
import PerformancePage from './pages/PerformancePage.js';

export default class UIManager {
  /**
   * UIManager 생성자
   * @param {HTMLElement} root - UI를 렌더링할 루트 요소
   * @param {Object} utils - 유틸리티 객체
   */
  constructor(root, utils) {
    this.root = root;
    this.utils = utils;
    this.pageChangeCallbacks = [];
    this._drawerDragListenerIds = [];
    this.currentPage = null;
    
    // 페이지 컴포넌트
    this.pages = {
      home: new HomePage(this, utils),
      basic: new BasicPage(this, utils),
      gesture: new GesturePage(this, utils),
      drag: new DragPage(this, utils),
      draw: new DrawPage(this, utils),
      capture: new CapturePage(this, utils),
      performance: new PerformancePage(this, utils)
    };
    
    // UI 요소 참조
    this.elements = {
      appBar: null,
      drawer: null,
      drawerOverlay: null,
      toast: null,
      content: null
    };
  }
  
  /**
   * UI 구성
   * 기본 레이아웃을 생성합니다.
   */
  buildUI() {
    // 기본 구조 생성
    this._createBaseLayout();
    
    // 서랍 메뉴 생성
    this._createDrawer();
    
    // 이벤트 리스너 설정
    this._setupEventListeners();
    
    // 브라우저 환경 정보 표시
    this._displayBrowserInfo();
    
    // 서랍 드래그 기능 설정
    this._setupDrawerDrag();
  }
  
  /**
   * 기본 레이아웃 생성
   * @private
   */
  _createBaseLayout() {
    // 앱바 생성
    const appBar = document.createElement('header');
    appBar.className = 'app-bar';
    appBar.innerHTML = `
      <button class="menu-btn" id="menuButton" aria-label="메뉴 열기">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <h1 class="app-title">UnifiedPointerEvents 테스트</h1>
    `;
    
    // 메인 컨텐츠 영역
    const content = document.createElement('main');
    content.className = 'main-container';
    content.id = 'contentContainer';
    
    // 토스트 메시지 영역
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.id = 'toast';
    
    // 루트에 추가
    this.root.appendChild(appBar);
    this.root.appendChild(content);
    this.root.appendChild(toast);
    
    // 요소 참조 저장
    this.elements.appBar = appBar;
    this.elements.content = content;
    this.elements.toast = toast;
  }
  
  /**
   * 서랍 메뉴 생성
   * @private
   */
  _createDrawer() {
    // 서랍 메뉴 오버레이
    const drawerOverlay = document.createElement('div');
    drawerOverlay.className = 'drawer-overlay';
    drawerOverlay.id = 'drawerOverlay';
    
    // 서랍 메뉴
    const drawer = document.createElement('aside');
    drawer.className = 'drawer';
    drawer.id = 'drawer';
    
    // 서랍 헤더
    const drawerHeader = document.createElement('div');
    drawerHeader.className = 'drawer-header';
    drawerHeader.innerHTML = `
      <h2>테스트 메뉴</h2>
    `;
    
    // 서랍 네비게이션
    const drawerNav = document.createElement('nav');
    drawerNav.className = 'drawer-nav';
    
    // 메뉴 항목
    const menuItems = [
      { id: 'home', icon: 'home', text: '홈' },
      { id: 'basic', icon: 'touch_app', text: '기본 포인터 이벤트' },
      { id: 'gesture', icon: 'swipe', text: '제스처 이벤트' },
      { id: 'drag', icon: 'drag_indicator', text: '드래그 이벤트' },
      { id: 'draw', icon: 'brush', text: '드로잉 캔버스' },
      { id: 'capture', icon: 'group_work', text: '포인터 캡처' },
      { id: 'performance', icon: 'speed', text: '성능 테스트' }
    ];
    
    menuItems.forEach(item => {
      const menuItem = document.createElement('button');
      menuItem.className = 'drawer-item';
      menuItem.dataset.page = item.id;
      menuItem.innerHTML = `
        <span class="material-symbols-outlined">${item.icon}</span>
        <span>${item.text}</span>
      `;
      drawerNav.appendChild(menuItem);
    });
    
    // 서랍 푸터
    const drawerFooter = document.createElement('div');
    drawerFooter.className = 'drawer-footer';
    drawerFooter.innerHTML = `
      <div class="browser-info">
        <div id="pointerSupport"></div>
        <div id="touchSupport"></div>
        <div id="debugMode">
          <input type="checkbox" id="debug-mode">
          <label for="debug-mode">디버그 모드</label>
        </div>
      </div>
    `;
    
    // 서랍 조립
    drawer.appendChild(drawerHeader);
    drawer.appendChild(drawerNav);
    drawer.appendChild(drawerFooter);
    
    // 루트에 추가
    this.root.appendChild(drawerOverlay);
    this.root.appendChild(drawer);
    
    // 요소 참조 저장
    this.elements.drawer = drawer;
    this.elements.drawerOverlay = drawerOverlay;
  }
  
  /**
   * 이벤트 리스너 설정
   * @private
   */
  _setupEventListeners() {
    // 메뉴 버튼 클릭 이벤트
    const menuButton = document.getElementById('menuButton');
    menuButton.addEventListener('click', () => this.openDrawer());
    
    // 서랍 오버레이 클릭 이벤트
    this.elements.drawerOverlay.addEventListener('click', () => this.closeDrawer());
    
    // 서랍 메뉴 항목 클릭 이벤트
    const drawerItems = this.elements.drawer.querySelectorAll('.drawer-item');
    drawerItems.forEach(item => {
      item.addEventListener('click', () => {
        const pageId = item.dataset.page;
        if (pageId) {
          this.navigateTo(pageId);
        }
      });
    });
  }
  
  /**
   * Drawer 드래그 기능 추가
   * 범위 제한 드래그를 사용하여 서랍을 열고 닫을 수 있게 합니다.
   * @private
   */
  _setupDrawerDrag() {
    const drawer = this.elements.drawer;
    const drawerWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--drawer-width'));
    
    // 드래그 핸들 생성
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drawer-drag-handle';
    dragHandle.style.cssText = `
      position: absolute;
      top: 0;
      right: -20px;
      width: 20px;
      height: 100%;
      cursor: e-resize;
      z-index: 1001;
      background: transparent;
    `;
    drawer.appendChild(dragHandle);
    
    // 드래그 상태 변수
    let initialDrawerState = false; // false: 닫힘, true: 열림
    
    // 드래그 시작 처리
    const dragStartId = window.unifiedPointerEvents.addEventListener(
      dragHandle,
      'dragstart',
      (event) => {
        // 현재 서랍 상태 저장
        initialDrawerState = drawer.classList.contains('open');
        
        // 기본 동작 방지
        event.preventDefault();
      },
      { preventDefault: true }
    );

    // 드래그 핸들 드래그 처리
    const dragId = window.unifiedPointerEvents.addEventListener(
      dragHandle,
      'drag',
      (event) => {
        // 현재 서랍 상태에 따라 x축 이동값 조정
        let moveX = event.deltaX;
        
        // 서랍이 열려있으면 오른쪽으로 드래그할 때 음수값으로, 닫혀있으면 왼쪽으로 드래그할 때 양수값으로
        if (initialDrawerState) {
          moveX = -moveX;
        }
        
        // 이동 범위 계산 (서랍 너비를 기준으로)
        let translateX = initialDrawerState 
          ? Math.min(0, Math.max(-drawerWidth, -moveX)) // 열린 상태에서는 0 ~ -drawerWidth
          : Math.max(-drawerWidth, Math.min(0, -drawerWidth + moveX)); // 닫힌 상태에서는 -drawerWidth ~ 0
        
        // 스타일 직접 적용
        drawer.style.transform = `translateX(${translateX}px)`;
        drawer.style.transition = 'none';
        
        // 오버레이 투명도 조절
        const progress = 1 + (translateX / drawerWidth);
        this.elements.drawerOverlay.style.opacity = progress.toString();
        this.elements.drawerOverlay.style.visibility = progress > 0 ? 'visible' : 'hidden';
        
        // 기본 동작 방지
        event.preventDefault();
      },
      { 
        preventDefault: true, 
        range: initialDrawerState ? { x: [0, drawerWidth] } : { x: [-drawerWidth, 0] },
        keepState: true
      }
    );
    
    // 드래그 종료 처리
    const dragEndId = window.unifiedPointerEvents.addEventListener(
      dragHandle,
      'dragend',
      (event) => {
        // 트랜지션 효과 복원
        drawer.style.transition = '';
        drawer.style.transform = '';
        
        // 종료 시점의 위치에 따라 서랍 열기/닫기 결정
        let translateX = initialDrawerState 
          ? Math.min(0, Math.max(-drawerWidth, -event.deltaX)) 
          : Math.max(-drawerWidth, Math.min(0, -drawerWidth + event.deltaX));
        
        // 절반 이상 이동했으면 상태 변경
        const threshold = -drawerWidth / 2;
        
        if (translateX < threshold) {
          this.closeDrawer();
        } else {
          this.openDrawer();
        }
        
        // 오버레이 스타일 초기화
        this.elements.drawerOverlay.style.opacity = '';
        this.elements.drawerOverlay.style.visibility = '';
        
        // 기본 동작 방지
        event.preventDefault();
      },
      { preventDefault: true }
    );
    
    // 리스너 ID 저장
    this._drawerDragListenerIds = [
      dragStartId,
      dragId,
      dragEndId
    ];

    // 서랍 오른쪽 가장자리 클릭으로 서랍 열기 기능 추가
    const edgeWidth = 20;
    const bodyClickListener = (e) => {
      if (drawer.classList.contains('open')) return;
      
      const drawerRect = drawer.getBoundingClientRect();
      const clickX = e.clientX;
      
      // 닫힌 서랍의 오른쪽 가장자리 부근 클릭 감지
      if (clickX >= drawerRect.right - edgeWidth && clickX <= drawerRect.right + edgeWidth) {
        this.openDrawer();
      }
    };
    
    document.body.addEventListener('click', bodyClickListener);
    
    // body 클릭 이벤트 리스너 정리 위해 저장
    this._bodyClickListener = bodyClickListener;
  }
  
  /**
   * 브라우저 환경 정보 표시
   * @private
   */
  _displayBrowserInfo() {
    const pointerSupport = 'PointerEvent' in window;
    const touchSupport = 'ontouchstart' in window;
    
    document.getElementById('pointerSupport').textContent = 
      `PointerEvent 지원: ${pointerSupport ? '예' : '아니오'}`;
    document.getElementById('touchSupport').textContent = 
      `터치 지원: ${touchSupport ? '예' : '아니오'}`;
    document.getElementById('debug-mode').addEventListener('change', (e) => {
      window.unifiedPointerEvents.setDebugMode(e.target.checked);
    });
  }
  
  /**
   * 서랍 메뉴 열기
   */
  openDrawer() {
    this.elements.drawer.classList.add('open');
    this.elements.drawerOverlay.classList.add('open');
  }
  
  /**
   * 서랍 메뉴 닫기
   */
  closeDrawer() {
    this.elements.drawer.classList.remove('open');
    this.elements.drawerOverlay.classList.remove('open');
    
    // 드래그 상태 초기화
    this.elements.drawer.classList.remove('dragging');
    this.elements.drawer.style.transform = '';
  }
  
  /**
   * 페이지 변경
   * @param {string} pageId - 이동할 페이지 ID
   */
  navigateTo(pageId) {
    // 페이지 존재 확인
    if (!this.pages[pageId]) {
      console.error(`페이지가 존재하지 않습니다: ${pageId}`);
      return;
    }
    
    // 현재 페이지와 같으면 무시
    if (this.currentPage === pageId) {
      this.closeDrawer();
      return;
    }
    
    // 이전 페이지 내용 제거
    this.elements.content.innerHTML = '';
    
    // 새 페이지 렌더링
    const pageElement = this.pages[pageId].render();
    this.elements.content.appendChild(pageElement);
    
    // 현재 페이지 업데이트
    this.currentPage = pageId;
    
    // 서랍 메뉴 닫기
    this.closeDrawer();
    
    // 서랍 메뉴 항목 활성화 상태 업데이트
    const drawerItems = this.elements.drawer.querySelectorAll('.drawer-item');
    drawerItems.forEach(item => {
      if (item.dataset.page === pageId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // 페이지 변경 콜백 호출
    this.pageChangeCallbacks.forEach(callback => callback(pageId));
  }
  
  /**
   * 페이지 변경 이벤트 콜백 등록
   * @param {Function} callback - 페이지 변경 시 호출될 콜백 함수
   */
  onPageChange(callback) {
    if (typeof callback === 'function') {
      this.pageChangeCallbacks.push(callback);
    }
  }
  
  /**
   * 이벤트 리스너를 가진 요소 생성
   * @param {string} tag - HTML 태그명
   * @param {Object} attributes - 속성 객체
   * @param {Object} events - 이벤트 객체 {eventName: callback}
   * @param {string|HTMLElement} content - 내용 (문자열 또는 HTMLElement)
   * @returns {HTMLElement} 생성된 요소
   */
  createElement(tag, attributes = {}, events = {}, content = '') {
    const element = document.createElement(tag);
    
    // 속성 설정
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });
    
    // 이벤트 리스너 설정
    Object.entries(events).forEach(([event, callback]) => {
      element.addEventListener(event, callback);
    });
    
    // 내용 설정
    if (content) {
      if (typeof content === 'string') {
        element.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        element.appendChild(content);
      }
    }
    
    return element;
  }
  
  /**
   * 로그 영역 생성
   * @param {string} id - 로그 영역 ID
   * @param {string} title - 로그 영역 제목
   * @returns {HTMLElement} 로그 영역 요소
   */
  createLogArea(id, title = '이벤트 로그') {
    const container = document.createElement('div');
    container.className = 'log-container';
    
    const titleElement = document.createElement('h3');
    titleElement.textContent = title;
    
    const logArea = document.createElement('div');
    logArea.className = 'log-area';
    logArea.id = id;
    
    const clearButton = document.createElement('button');
    clearButton.className = 'clear-log-btn';
    clearButton.textContent = '로그 지우기';
    clearButton.addEventListener('click', () => {
      logArea.innerHTML = '';
    });
    
    container.appendChild(titleElement);
    container.appendChild(logArea);
    container.appendChild(clearButton);
    
    return container;
  }
}