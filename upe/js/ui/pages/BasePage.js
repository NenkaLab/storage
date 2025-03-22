/**
 * 기본 페이지 템플릿
 * 모든 페이지의 기본 구조를 정의합니다.
 */
export default class BasePage {
  /**
   * 생성자
   * @param {UIManager} ui - UI 관리자
   * @param {Utils} utils - 유틸리티 객체
   */
  constructor(ui, utils) {
    this.ui = ui;
    this.utils = utils;
    this.pageElement = null;
    this.pageId = '';
    this.pageTitle = '페이지';
  }
  
  /**
   * 페이지 렌더링
   * @returns {HTMLElement} 페이지 요소
   */
  render() {
    const page = document.createElement('section');
    page.className = 'page';
    page.id = `${this.pageId}Page`;
    
    const card = document.createElement('div');
    card.className = 'card';
    
    // 헤더 생성
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    
    const cardTitle = document.createElement('h2');
    cardTitle.className = 'card-title';
    cardTitle.textContent = this.pageTitle;
    
    const backButton = document.createElement('button');
    backButton.className = 'back-btn';
    backButton.innerHTML = '<span class="material-symbols-outlined">arrow_back</span>';
    backButton.addEventListener('click', () => {
      this.ui.navigateTo('home');
    });
    
    cardHeader.appendChild(cardTitle);
    cardHeader.appendChild(backButton);
    
    // 콘텐츠 영역
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    
    // 자식 클래스에서 콘텐츠 추가
    this.createContent(cardContent);
    
    // 카드 조립
    card.appendChild(cardHeader);
    card.appendChild(cardContent);
    
    // 페이지에 추가
    page.appendChild(card);
    
    this.pageElement = page;
    return page;
  }
  
  /**
   * 페이지 콘텐츠 생성 (자식 클래스에서 구현)
   * @param {HTMLElement} container - 콘텐츠 컨테이너
   */
  createContent(container) {
    // 상속받는 클래스에서 구현
    const placeholder = document.createElement('p');
    placeholder.textContent = '이 페이지는 아직 구현되지 않았습니다.';
    container.appendChild(placeholder);
  }
  
  /**
   * 페이지 초기화 (필요한 경우 자식 클래스에서 구현)
   */
  init() {
    // 기본적으로 아무것도 하지 않음
    // 자식 클래스에서 필요에 따라 구현
  }
  
  /**
   * 테스트 영역 생성 헬퍼
   * @param {string} id - 테스트 영역 ID
   * @param {string} instruction - 테스트 지침
   * @returns {HTMLElement} 테스트 영역 요소
   */
  createTestArea(id, instruction) {
    const container = document.createElement('div');
    container.className = 'test-area-container';
    
    const testArea = document.createElement('div');
    testArea.className = 'test-area';
    testArea.id = id;
    
    const instructionEl = document.createElement('div');
    instructionEl.className = 'test-instruction';
    instructionEl.textContent = instruction;
    
    testArea.appendChild(instructionEl);
    container.appendChild(testArea);
    
    return container;
  }
  
  /**
   * 컨트롤 패널 생성 헬퍼
   * @returns {HTMLElement} 컨트롤 패널 요소
   */
  createControlPanel() {
    const panel = document.createElement('div');
    panel.className = 'control-panel';
    return panel;
  }
  
  /**
   * 컨트롤 그룹 생성 헬퍼
   * @param {string} label - 레이블 텍스트
   * @returns {HTMLElement} 컨트롤 그룹 요소
   */
  createControlGroup(label) {
    const group = document.createElement('div');
    group.className = 'control-group';
    
    if (label) {
      const labelEl = document.createElement('label');
      labelEl.textContent = label;
      group.appendChild(labelEl);
    }
    
    return group;
  }
  
  /**
   * 레인지 인풋 생성 헬퍼
   * @param {string} id - 인풋 ID
   * @param {number} min - 최소값
   * @param {number} max - 최대값
   * @param {number} value - 초기값
   * @param {number} step - 단계
   * @param {string} valueId - 값 표시 요소 ID
   * @param {string} unit - 단위
   * @returns {HTMLElement} 인풋 컨테이너
   */
  createRangeInput(id, min, max, value, step = 1, valueId = null, unit = '') {
    const container = document.createElement('div');
    container.className = 'input-with-value';
    
    const input = document.createElement('input');
    input.type = 'range';
    input.id = id;
    input.min = min;
    input.max = max;
    input.value = value;
    input.step = step;
    
    container.appendChild(input);
    
    if (valueId) {
      const valueDisplay = document.createElement('span');
      valueDisplay.id = valueId;
      valueDisplay.textContent = `${value}${unit}`;
      
      input.addEventListener('input', () => {
        valueDisplay.textContent = `${input.value}${unit}`;
      });
      
      container.appendChild(valueDisplay);
    }
    
    return container;
  }
  
  /**
   * 라디오 그룹 생성 헬퍼
   * @param {string} name - 라디오 그룹 이름
   * @param {Array} options - 옵션 배열 [{value, label, checked}]
   * @returns {HTMLElement} 라디오 그룹 요소
   */
  createRadioGroup(name, options) {
    const group = document.createElement('div');
    group.className = 'radio-group';
    
    options.forEach(option => {
      const label = document.createElement('label');
      
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = name;
      input.value = option.value;
      
      if (option.checked) {
        input.checked = true;
      }
      
      const span = document.createElement('span');
      span.textContent = option.label;
      
      label.appendChild(input);
      label.appendChild(span);
      group.appendChild(label);
    });
    
    return group;
  }
  
  /**
   * 체크박스 생성 헬퍼
   * @param {string} id - 체크박스 ID
   * @param {string} label - 레이블 텍스트
   * @param {boolean} checked - 체크 여부
   * @returns {HTMLElement} 체크박스 컨테이너
   */
  createCheckbox(id, label, checked = false) {
    const container = document.createElement('div');
    container.className = 'checkbox-group';
    
    const labelEl = document.createElement('label');
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.checked = checked;
    
    const span = document.createElement('span');
    span.textContent = label;
    
    labelEl.appendChild(input);
    labelEl.appendChild(span);
    container.appendChild(labelEl);
    
    return container;
  }
  
  /**
   * 버튼 생성 헬퍼
   * @param {string} id - 버튼 ID
   * @param {string} text - 버튼 텍스트
   * @param {string} className - 추가 클래스
   * @returns {HTMLElement} 버튼 요소
   */
  createButton(id, text, className = '') {
    const button = document.createElement('button');
    button.id = id;
    button.textContent = text;
    button.className = `action-btn ${className}`.trim();
    return button;
  }
}