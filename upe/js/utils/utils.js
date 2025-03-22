/**
 * 유틸리티 클래스
 * 자주 사용되는 유틸리티 함수들을 제공합니다.
 */
export default class Utils {
  /**
   * 토스트 메시지 표시
   * @param {string} message - 표시할 메시지
   * @param {string} type - 메시지 유형 (success, error 등)
   * @param {number} duration - 표시 시간(ms)
   */
  showToast(message, type = '', duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast show';
    
    if (type) {
      toast.classList.add(type);
    }
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.className = 'toast';
      }, 300);
    }, duration);
  }
  
  /**
   * 로그 항목 추가
   * @param {HTMLElement} logArea - 로그를 추가할 요소
   * @param {string} message - 로그 메시지
   * @param {string} type - 로그 유형 (success, error, info, warning)
   * @param {boolean} prepend - 로그를 위에 추가할지 여부
   */
  addLogEntry(logArea, message, type = '', prepend = true) {
    if (!logArea) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    if (type) {
      logEntry.classList.add(type);
    }
    
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    if (prepend) {
      logArea.prepend(logEntry);
    } else {
      logArea.appendChild(logEntry);
    }
    
    // 로그 스크롤
    if (prepend) {
      logArea.scrollTop = 0;
    } else {
      logArea.scrollTop = logArea.scrollHeight;
    }
  }
  
  /**
   * 포인터 유형 한글화
   * @param {string} type - 포인터 유형 (mouse, touch, pen)
   * @return {string} 한글화된 포인터 유형
   */
  pointerTypeToKorean(type) {
    switch (type) {
      case 'mouse': return '마우스';
      case 'touch': return '터치';
      case 'pen': return '펜';
      default: return type;
    }
  }
  
  /**
   * 이벤트 유형 한글화
   * @param {string} type - 이벤트 유형
   * @return {string} 한글화된 이벤트 유형
   */
  eventTypeToKorean(type) {
    switch (type) {
      case 'start': return '시작';
      case 'move': return '이동';
      case 'end': return '종료';
      case 'cancel': return '취소';
      case 'longclick': return '롱클릭';
      case 'doubleclick': return '더블클릭';
      case 'swipe': return '스와이프';
      case 'dragstart': return '드래그 시작';
      case 'drag': return '드래그';
      case 'dragend': return '드래그 종료';
      case 'gotcapture': return '캡처 획득';
      case 'lostcapture': return '캡처 해제';
      default: return type;
    }
  }
  
  /**
   * 방향 한글화
   * @param {string} direction - 방향 (left, right, up, down)
   * @return {string} 한글화된 방향
   */
  directionToKorean(direction) {
    switch (direction) {
      case 'left': return '왼쪽';
      case 'right': return '오른쪽';
      case 'up': return '위';
      case 'down': return '아래';
      default: return direction;
    }
  }
  
  /**
   * 포인터가 요소 내부에 있는지 확인
   * @param {number} x - X 좌표
   * @param {number} y - Y 좌표
   * @param {HTMLElement} element - 확인할 요소
   * @return {boolean} 포인터가 요소 내부에 있는지 여부
   */
  isPointInElement(x, y, element) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    );
  }
  
  /**
   * 디바운스(debounce) 함수
   * @param {Function} func - 실행할 함수
   * @param {number} wait - 대기 시간(ms)
   * @return {Function} 디바운스된 함수
   */
  debounce(func, wait = 100) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
  
  /**
   * 쓰로틀(throttle) 함수
   * @param {Function} func - 실행할 함수
   * @param {number} limit - 제한 시간(ms)
   * @return {Function} 쓰로틀된 함수
   */
  throttle(func, limit = 100) {
    let lastFunc;
    let lastRan;
    return function(...args) {
      if (!lastRan) {
        func.apply(this, args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if (Date.now() - lastRan >= limit) {
            func.apply(this, args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    };
  }
  
  /**
   * 랜덤 정수 생성
   * @param {number} min - 최소값
   * @param {number} max - 최대값
   * @return {number} 랜덤 정수
   */
  getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * 랜덤 색상 생성
   * @return {string} 랜덤 16진수 색상
   */
  getRandomColor() {
    return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
  }
  
  /**
   * 요소 생성 헬퍼
   * @param {string} tag - HTML 태그명
   * @param {Object} attributes - 속성 객체
   * @param {string|HTMLElement} content - 내용 (문자열 또는 HTMLElement)
   * @returns {HTMLElement} 생성된 요소
   */
  createEl(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    // 속성 설정
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'class' || key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
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
   * 메모리 사용량 정보 가져오기 (지원되는 브라우저만)
   * @return {Object|null} 메모리 사용량 정보
   */
  getMemoryUsage() {
    if (window.performance && window.performance.memory) {
      const memory = window.performance.memory;
      return {
        total: this.formatBytes(memory.totalJSHeapSize),
        used: this.formatBytes(memory.usedJSHeapSize),
        limit: this.formatBytes(memory.jsHeapSizeLimit),
        percentage: Math.round(memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100)
      };
    }
    return null;
  }
  
  /**
   * 바이트 단위를 읽기 쉬운 형식으로 변환
   * @param {number} bytes - 바이트 수
   * @return {string} 변환된 형식
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}