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
      case 'rotate': return '회전';
      case 'pinchzoom': return '핀치줌';
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
  
  /**
   * 두 점 사이의 각도를 계산합니다 (도 단위)
   * @param {number} x1 - 첫 번째 점의 X 좌표
   * @param {number} y1 - 첫 번째 점의 Y 좌표
   * @param {number} x2 - 두 번째 점의 X 좌표
   * @param {number} y2 - 두 번째 점의 Y 좌표
   * @return {number} 각도 (0-360도)
   */
  calculateAngle(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // 각도 범위를 0-360으로 조정
    if (angle < 0) {
      angle += 360;
    }
    
    return angle;
  }
  
  /**
   * 각도를 정규화합니다 (0-360도)
   * @param {number} angle - 정규화할 각도
   * @return {number} 정규화된 각도 (0-360도)
   */
  normalizeAngle(angle) {
    let normalized = angle % 360;
    if (normalized < 0) {
      normalized += 360;
    }
    return normalized;
  }
  
  /**
   * 두 점 사이의 거리를 계산합니다
   * @param {number} x1 - 첫 번째 점의 X 좌표
   * @param {number} y1 - 첫 번째 점의 Y 좌표
   * @param {number} x2 - 두 번째 점의 X 좌표
   * @param {number} y2 - 두 번째 점의 Y 좌표
   * @return {number} 거리
   */
  calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * 이동 거리와 시간으로 속도를 계산합니다
   * @param {number} distance - 이동 거리
   * @param {number} timeMs - 소요 시간 (밀리초)
   * @return {number} 속도 (픽셀/초)
   */
  calculateVelocity(distance, timeMs) {
    if (timeMs <= 0) return 0;
    return distance / (timeMs / 1000); // 초당 픽셀 단위
  }
  
  /**
   * 회전 각도 변화량 계산
   * @param {number} prevAngle - 이전 각도
   * @param {number} currentAngle - 현재 각도
   * @return {number} 각도 변화량
   */
  calculateAngleDelta(prevAngle, currentAngle) {
    // 두 각도의 차이를 구함 (0-360도 범위에서)
    let delta = currentAngle - prevAngle;
    
    // 최단 경로로 회전하기 위한 조정
    if (delta > 180) {
      delta -= 360;
    } else if (delta < -180) {
      delta += 360;
    }
    
    return delta;
  }
  
  /**
   * 배율 변화량 계산
   * @param {number} prevDistance - 이전 거리
   * @param {number} currentDistance - 현재 거리
   * @return {number} 배율 변화량
   */
  calculateScaleFactor(prevDistance, currentDistance) {
    if (prevDistance <= 0) return 1.0;
    return currentDistance / prevDistance;
  }
  
  /**
   * 최소, 최대 범위 내로 값을 제한합니다
   * @param {number} value - 대상 값
   * @param {number} min - 최소값
   * @param {number} max - 최대값
   * @return {number} 제한된 값
   */
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  
  /**
   * 회전 행렬을 사용하여 점을 회전합니다
   * @param {number} x - 회전할 점의 X 좌표
   * @param {number} y - 회전할 점의 Y 좌표
   * @param {number} centerX - 회전 중심의 X 좌표
   * @param {number} centerY - 회전 중심의 Y 좌표
   * @param {number} angle - 회전 각도 (도 단위)
   * @return {Object} 회전된 점의 좌표 {x, y}
   */
  rotatePoint(x, y, centerX, centerY, angle) {
    // 회전 중심을 원점으로 이동
    const translatedX = x - centerX;
    const translatedY = y - centerY;
    
    // 라디안으로 변환
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    
    // 회전 변환
    const rotatedX = translatedX * cos - translatedY * sin;
    const rotatedY = translatedX * sin + translatedY * cos;
    
    // 원래 위치로 이동
    return {
      x: rotatedX + centerX,
      y: rotatedY + centerY
    };
  }
  
  /**
   * 선형 보간법 (Linear Interpolation)
   * @param {number} start - 시작값
   * @param {number} end - 종료값
   * @param {number} t - 보간 계수 (0-1)
   * @return {number} 보간된 값
   */
  lerp(start, end, t) {
    return start + (end - start) * this.clamp(t, 0, 1);
  }
  
  /**
   * 부드러운 감속 계수 계산 (Smooth Damping Factor)
   * @param {number} factor - 감속 계수 (0-1)
   * @param {number} deltaTime - 경과 시간 (초 단위)
   * @param {number} fps - 기준 프레임 속도
   * @return {number} 시간에 따른 감속 계수
   */
  smoothDampingFactor(factor, deltaTime, fps = 60) {
    return Math.pow(factor, deltaTime * fps);
  }
}