/**
 * 기본 포인터 이벤트 페이지
 * 기본 포인터 이벤트 (start, move, end, cancel)를 테스트합니다.
 */
import BasePage from './BasePage.js';

export default class BasicPage extends BasePage {
  constructor(ui, utils) {
    super(ui, utils);
    this.pageId = 'basic';
    this.pageTitle = '기본 포인터 이벤트';
    this.listenerIds = [];
  }
  
  /**
   * 페이지 콘텐츠 생성
   * @param {HTMLElement} container - 콘텐츠 컨테이너
   */
  createContent(container) {
    // 설명
    const description = document.createElement('p');
    description.textContent = '아래 영역에서 포인터(마우스/터치/펜) 이벤트를 테스트하세요. 이벤트 발생 시 세부 정보가 로그에 표시됩니다.';
    container.appendChild(description);
    
    // 테스트 영역 생성
    const testAreaContainer = this.createTestArea('basicTestArea', '이 영역에서 클릭/터치/펜을 사용해보세요');
    container.appendChild(testAreaContainer);
    
    // 컨트롤 패널
    const controlPanel = this.createControlPanel();
    
    // 이벤트 필터링 컨트롤
    const filterGroup = this.createControlGroup('이벤트 필터링:');
    
    // 라디오 버튼 그룹
    const radioGroup = this.createRadioGroup('deviceFilter', [
      { value: 'all', label: '모든 장치', checked: true },
      { value: 'mouse', label: '마우스만' },
      { value: 'touch', label: '터치만' },
      { value: 'pen', label: '펜만' }
    ]);
    
    filterGroup.appendChild(radioGroup);
    controlPanel.appendChild(filterGroup);
    
    // preventDefault 옵션
    const optionGroup = this.createControlGroup('이벤트 옵션:');
    const preventDefaultCheck = this.createCheckbox('preventDefaultBasic', 'preventDefault 사용', true);
    optionGroup.appendChild(preventDefaultCheck);
    controlPanel.appendChild(optionGroup);
    
    // 로그 지우기 버튼
    const clearButton = this.createButton('clearBasicLog', '로그 지우기');
    controlPanel.appendChild(clearButton);
    
    testAreaContainer.appendChild(controlPanel);
    
    // 로그 영역
    const logContainer = document.createElement('div');
    logContainer.className = 'log-container';
    
    const logTitle = document.createElement('h3');
    logTitle.textContent = '이벤트 로그';
    
    const logArea = document.createElement('div');
    logArea.className = 'log-area';
    logArea.id = 'basicLog';
    
    logContainer.appendChild(logTitle);
    logContainer.appendChild(logArea);
    
    testAreaContainer.appendChild(logContainer);
    
    // 이벤트 리스너 설정
    // 이 곳에서는 DOM 요소만 배치하고,
    // init 메서드에서 실제 이벤트 리스너를 설정합니다.
    
    // 로그 지우기 버튼 이벤트
    clearButton.addEventListener('click', () => {
      logArea.innerHTML = '';
    });
  }
  
  /**
   * 페이지 초기화
   * 실제 이벤트 리스너를 설정합니다.
   */
  init() {
    // 이전 리스너 제거
    this.removeEventListeners();
    
    // 필요한 DOM 요소 참조
    const testArea = document.getElementById('basicTestArea');
    const logArea = document.getElementById('basicLog');
    
    if (!testArea || !logArea) {
      console.error('필요한 DOM 요소를 찾을 수 없습니다.');
      return;
    }
    
    // 이벤트 옵션 가져오기
    const filterValue = document.querySelector('input[name="deviceFilter"]:checked')?.value || 'all';
    const preventDefault = document.getElementById('preventDefaultBasic')?.checked || false;
    
    // 이벤트 옵션 설정
    const options = { preventDefault };
    
    // 필터 적용
    if (filterValue === 'mouse') {
      options.mouseOnly = true;
    } else if (filterValue === 'touch') {
      options.touchOnly = true;
    } else if (filterValue === 'pen') {
      options.penOnly = true;
    }
    
    // 이벤트 타입별 핸들러
    const eventTypes = ['start', 'move', 'end', 'cancel'];
    
    // 각 이벤트 타입에 대한 리스너 등록
    eventTypes.forEach(eventType => {
      const listenerId = window.unifiedPointerEvents.addEventListener(
        testArea,
        eventType,
        (event) => this.handleBasicEvent(event, logArea),
        options
      );
      
      this.listenerIds.push(listenerId);
    });
    
    // 필터 변경 이벤트
    const radioButtons = document.querySelectorAll('input[name="deviceFilter"]');
    radioButtons.forEach(radio => {
      radio.addEventListener('change', () => this.init());
    });
    
    // preventDefault 변경 이벤트
    const preventDefaultCheck = document.getElementById('preventDefaultBasic');
    if (preventDefaultCheck) {
      preventDefaultCheck.addEventListener('change', () => this.init());
    }
    
    // 초기화 로그
    const filterName = filterValue === 'all' 
      ? '모든' 
      : this.utils.pointerTypeToKorean(filterValue);
      
    this.utils.addLogEntry(
      logArea, 
      `${filterName} 입력 장치에 대한 리스너가 설정되었습니다.`, 
      'info'
    );
  }
  
  /**
   * 기본 이벤트 핸들러
   * @param {Object} event - 통합 포인터 이벤트
   * @param {HTMLElement} logArea - 로그 출력 영역
   */
  handleBasicEvent(event, logArea) {
    // 포인터 타입 및 이벤트 타입 한글화
    const pointerTypeKo = this.utils.pointerTypeToKorean(event.pointerType);
    const eventTypeKo = this.utils.eventTypeToKorean(event.type);
    
    // 로그 메시지 구성
    let message = `${pointerTypeKo} ${eventTypeKo} - X: ${Math.round(event.clientX)}, Y: ${Math.round(event.clientY)}`;
    
    // 압력 정보가 있으면 추가
    if (event.pressure > 0) {
      message += `, 압력: ${event.pressure.toFixed(2)}`;
    }
    
    // 로그에 추가
    this.utils.addLogEntry(logArea, message);
    
    // 시각적 피드백
    const testArea = document.getElementById('basicTestArea');
    if (testArea) {
      if (event.type === 'start') {
        testArea.style.backgroundColor = 'var(--primary-light)';
      } else if (event.type === 'end' || event.type === 'cancel') {
        setTimeout(() => {
          testArea.style.backgroundColor = '';
        }, 300);
      }
    }
  }
  
  /**
   * 등록된 이벤트 리스너 제거
   */
  removeEventListeners() {
    this.listenerIds.forEach(id => {
      window.unifiedPointerEvents.removeEventListener(id);
    });
    this.listenerIds = [];
  }
}