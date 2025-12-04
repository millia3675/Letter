/**
 * DDB Letter - Storage Module
 * 클라이언트 사이드 스토리지 유틸리티 (보조 모듈)
 * 메인 스토리지 로직은 preload.js에서 처리됨
 */

const Storage = {
  /**
   * LocalStorage에 데이터 저장
   * @param {string} key - 저장 키
   * @param {any} value - 저장할 값
   */
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('LocalStorage 저장 실패:', e);
    }
  },
  
  /**
   * LocalStorage에서 데이터 가져오기
   * @param {string} key - 키
   * @param {any} defaultValue - 기본값
   * @returns {any} 저장된 값 또는 기본값
   */
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('LocalStorage 읽기 실패:', e);
      return defaultValue;
    }
  },
  
  /**
   * LocalStorage에서 데이터 삭제
   * @param {string} key - 키
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('LocalStorage 삭제 실패:', e);
    }
  },
  
  /**
   * 오늘 날짜 문자열 반환
   * @returns {string} YYYY-MM-DD 형식
   */
  getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  },
  
  /**
   * 오늘 특정 작업을 수행했는지 확인
   * @param {string} actionType - 작업 유형 (예: 'letter', 'fortune')
   * @returns {boolean}
   */
  didTodayAction(actionType) {
    const key = `${actionType}_${this.getTodayKey()}`;
    return this.get(key, false);
  },
  
  /**
   * 오늘 특정 작업을 수행했음을 기록
   * @param {string} actionType - 작업 유형
   */
  markTodayAction(actionType) {
    const key = `${actionType}_${this.getTodayKey()}`;
    this.set(key, true);
  }
};

// 전역으로 노출
window.Storage = Storage;
