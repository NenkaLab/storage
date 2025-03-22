/**
 * 홈 페이지
 * 메인 기능 소개 및 네비게이션을 제공합니다.
 */
import BasePage from './BasePage.js';

export default class HomePage extends BasePage {
  constructor(ui, utils) {
    super(ui, utils);
    this.pageId = 'home';
    this.pageTitle = 'UnifiedPointerEvents 테스트';
  }
  
  /**
   * 페이지 콘텐츠 생성
   * @param {HTMLElement} container - 콘텐츠 컨테이너
   */
  createContent(container) {
    // 소개 문구
    const intro = document.createElement('p');
    intro.textContent = '이 페이지는 다양한 입력 방식(마우스, 터치, 펜)을 통합적으로 처리하는 라이브러리를 테스트합니다.';
    container.appendChild(intro);
    
    // 기능 그리드
    const featureGrid = document.createElement('div');
    featureGrid.className = 'feature-grid';
    
    // 기능 항목
    const features = [
      {
        id: 'basic',
        icon: 'touch_app',
        title: '기본 포인터 이벤트',
        description: 'start, move, end, cancel 이벤트 테스트'
      },
      {
        id: 'gesture',
        icon: 'swipe',
        title: '제스처 이벤트',
        description: '롱클릭, 더블클릭, 스와이프 테스트'
      },
      {
        id: 'drag',
        icon: 'drag_indicator',
        title: '드래그 이벤트',
        description: '범위 제한 및 무제한 드래그 테스트'
      },
      {
        id: 'draw',
        icon: 'brush',
        title: '드로잉 캔버스',
        description: '포인터 이동 추적 및 그리기 테스트'
      },
      {
        id: 'capture',
        icon: 'group_work',
        title: '포인터 캡처',
        description: 'setPointerCapture API 테스트'
      },
      {
        id: 'performance',
        icon: 'speed',
        title: '성능 테스트',
        description: '이벤트 처리 성능 및 메모리 사용량 테스트'
      }
    ];
    
    // 기능 항목 생성
    features.forEach(feature => {
      const item = document.createElement('div');
      item.className = 'feature-item';
      item.dataset.page = feature.id;
      
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      icon.textContent = feature.icon;
      
      const title = document.createElement('h3');
      title.textContent = feature.title;
      
      const description = document.createElement('p');
      description.textContent = feature.description;
      
      item.appendChild(icon);
      item.appendChild(title);
      item.appendChild(description);
      
      // 클릭 이벤트
      item.addEventListener('click', () => {
        this.ui.navigateTo(feature.id);
      });
      
      featureGrid.appendChild(item);
    });
    
    container.appendChild(featureGrid);
  }
  
  /**
   * 커스텀 렌더링
   * 홈 페이지는 뒤로가기 버튼이 없습니다.
   * @returns {HTMLElement} 페이지 요소
   */
  render() {
    const page = document.createElement('section');
    page.className = 'page';
    page.id = `${this.pageId}Page`;
    
    const card = document.createElement('div');
    card.className = 'card';
    
    // 헤더 생성 (뒤로가기 버튼 없음)
    const cardHeader = document.createElement('div');
    cardHeader.className = 'card-header';
    
    const cardTitle = document.createElement('h2');
    cardTitle.className = 'card-title';
    cardTitle.textContent = this.pageTitle;
    
    cardHeader.appendChild(cardTitle);
    
    // 콘텐츠 영역
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    
    // 콘텐츠 추가
    this.createContent(cardContent);
    
    // 카드 조립
    card.appendChild(cardHeader);
    card.appendChild(cardContent);
    
    // 페이지에 추가
    page.appendChild(card);
    
    this.pageElement = page;
    return page;
  }
}