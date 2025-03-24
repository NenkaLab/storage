/**
 * UnifiedPointerEvents 테스트 애플리케이션
 * 메인 진입점 모듈
 */
import UIManager from './ui/UIManager.js';
import BasicTest from './modules/BasicTest.js';
import GestureTest from './modules/GestureTest.js';
import DragTest from './modules/DragTest.js';
import DrawTest from './modules/DrawTest.js';
import CaptureTest from './modules/CaptureTest.js';
import PerformanceTest from './modules/PerformanceTest.js';
import Utils from './utils/utils.js';

class App {
  constructor() {
    this.root = document.getElementById('root');
    this.utils = new Utils();
    this.ui = new UIManager(this.root, this.utils);
    
    // 테스트 모듈 인스턴스
    this.modules = {
      basic: new BasicTest(this.ui, this.utils),
      gesture: new GestureTest(this.ui, this.utils),
      drag: new DragTest(this.ui, this.utils),
      draw: new DrawTest(this.ui, this.utils),
      capture: new CaptureTest(this.ui, this.utils),
      performance: new PerformanceTest(this.ui, this.utils)
    };
    
    // 앱 초기화
    this.init();
  }
  
  /**
   * 앱 초기화
   */
  init() {
    // UI 초기 구성
    this.ui.buildUI();
    
    // 페이지 변경 이벤트 처리 설정
    this.ui.onPageChange((pageId) => this.handlePageChange(pageId));
    
    // 초기 페이지 설정
    this.ui.navigateTo('home');
    
    // 앱 시작 알림
    this.utils.showToast('UnifiedPointerEvents 테스트 앱이 시작되었습니다.');
  }
  
  /**
   * 페이지 변경 처리
   * @param {string} pageId - 페이지 ID
   */
  handlePageChange(pageId) {
    // 페이지에 따른 모듈 초기화
    switch (pageId) {
      case 'basic':
        this.modules.basic.init();
        break;
      case 'gesture':
        this.modules.gesture.init();
        break;
      case 'drag':
        this.modules.drag.init();
        break;
      case 'draw':
        this.modules.draw.init();
        break;
      case 'capture':
        this.modules.capture.init();
        break;
      case 'performance':
        this.modules.performance.init();
        break;
    }
  }
}

// 앱 인스턴스 생성 및 시작
function startApp() {
  window.app = new App();
}

// 이미 페이지가 로딩되었는지 확인
if (document.readyState !== "loading") {
  startApp();
} else {
  document.addEventListener("DOMContentLoaded", startApp);
}
