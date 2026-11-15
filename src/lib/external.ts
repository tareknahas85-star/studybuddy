import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

/** يفتح رابط بالمتصفح الخارجي للتلفون (داخل التطبيق ما بيشتغل). */
export function openExternal(url: string): void {
  if (Capacitor.isNativePlatform()) {
    void Browser.open({ url })
    return
  }
  window.open(url, '_blank', 'noopener')
}
