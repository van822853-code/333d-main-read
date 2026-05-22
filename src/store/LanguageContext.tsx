import React, { createContext, useContext, useState } from 'react';

type Language = 'en' | 'zh' | 'ja' | 'ko';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    title: 'Nexus',
    subtitle: 'Cosmos',
    desc: '3D Interactive Exhibition Space',
    navCtrl: 'Navigation Control',
    wasdKeys: 'WASD Keys',
    moveCamera: 'Move Camera',
    dragScroll: 'Drag & Scroll',
    rotateZoom: 'Rotate & Zoom',
    posLabel: 'POS',
    fovLabel: 'FOV',
    sysStatus: 'SYSTEM STATUS: NOMINAL',
    viewLogs: 'VIEW LOGS',
    previewing: 'PREVIEWING',
    destination: 'Destination',
    nodeStatus: 'Node Status',
    stable: 'Stable',
    tracking: 'Tracking...',
    resetView: 'Reset View',
    startRoute: 'Start Route',
    restartRoute: 'Restart Route',
    routeAuto: 'Automatic route motion; drag and scroll to look around.',
    dismiss: 'Dismiss',
  },
  zh: {
    title: '声成',
    subtitle: '回响',
    desc: '3D 交互式展览空间',
    navCtrl: '导航控制',
    wasdKeys: 'WASD 键',
    moveCamera: '移动视角',
    dragScroll: '拖拽 & 滚轮',
    rotateZoom: '旋转 & 缩放',
    posLabel: '坐标',
    fovLabel: '视野',
    sysStatus: '系统状态：正常',
    viewLogs: '查看日志',
    previewing: '正在预览',
    destination: '目标地址',
    nodeStatus: '节点状态',
    stable: '稳定',
    tracking: '追踪中...',
    resetView: '重置视角',
    startRoute: '开始',
    restartRoute: '重新开始',
    routeAuto: '路线自动前进，拖拽滚轮可自由视角。',
    dismiss: '关闭',
  },
  ja: {
    title: 'ネクサス',
    subtitle: 'コスモス',
    desc: '3Dインタラクティブ展示スペース',
    navCtrl: 'ナビゲーション制御',
    wasdKeys: 'WASDキー',
    moveCamera: 'カメラ移動',
    dragScroll: 'ドラッグ＆スクロール',
    rotateZoom: '回転＆ズーム',
    posLabel: '位置',
    fovLabel: '視野',
    sysStatus: 'システム状態: 正常',
    viewLogs: 'ログを見る',
    previewing: 'プレビュー中',
    destination: '目的地',
    nodeStatus: 'ノード状態',
    stable: '安定',
    tracking: '追跡中...',
    resetView: '視点リセット',
    startRoute: '開始',
    restartRoute: '再開',
    routeAuto: '自動でルートが移動します。ドラッグとスクロールで自由に視点を変更できます。',
    dismiss: '閉じる',
  },
  ko: {
    title: '넥서스',
    subtitle: '코스모스',
    desc: '3D 대화형 전시 공간',
    navCtrl: '탐색 제어',
    wasdKeys: 'WASD 키',
    moveCamera: '카메라 이동',
    dragScroll: '드래그 & 스크롤',
    rotateZoom: '회전 & 줌',
    posLabel: '좌표',
    fovLabel: '시야',
    sysStatus: '시스템 상태: 정상',
    viewLogs: '로그 보기',
    previewing: '미리보기',
    destination: '목적지',
    nodeStatus: '노드 상태',
    stable: '안정됨',
    tracking: '추적 중...',
    resetView: '시점 초기화',
    startRoute: '시작',
    restartRoute: '다시 시작',
    routeAuto: '자동으로 경로가 움직입니다. 드래그와 스크롤로 자유롭게 시점을 변경할 수 있습니다.',
    dismiss: '닫기',
  }
};

const LanguageContext = createContext<LanguageContextType>({} as any);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLang] = useState<Language>('zh');

  const t = (key: string) => translations[lang][key as keyof typeof translations['en']] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
