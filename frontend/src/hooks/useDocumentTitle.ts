import { useEffect } from 'react';

export type TitleState = 'loading' | 'scanning' | 'processing' | 'completed' | 'error' | 'default';

export const useDocumentTitle = (state: TitleState, fileName?: string) => {
  useEffect(() => {
    const baseTitle = 'Mathtools - PDF数学公式扫描工具';
    
    let title = baseTitle;
    
    switch (state) {
      case 'loading':
        title = '上传中... - ' + baseTitle;
        break;
      case 'scanning':
        title = '扫描中... - ' + baseTitle;
        break;
      case 'processing':
        title = '处理中... - ' + baseTitle;
        break;
      case 'completed':
        title = '扫描完成 - ' + baseTitle;
        break;
      case 'error':
        title = '扫描失败 - ' + baseTitle;
        break;
      case 'default':
      default:
        title = baseTitle;
        break;
    }
    
    if (fileName && state !== 'default') {
    title = `${fileName} - ${title}`;
    }
    
    document.title = title;
  }, [state, fileName]);
};

export default useDocumentTitle;
