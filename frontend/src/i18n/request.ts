import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export type Locale = 'zh' | 'en';
export const defaultLocale: Locale = 'zh';
export const locales: Locale[] = ['zh', 'en'];

/**
 * next-intl 请求配置
 * 根据用户偏好或浏览器设置返回对应语言的消息
 */
export default getRequestConfig(async () => {
    // 尝试从 cookie 获取语言偏好
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('locale')?.value as Locale | undefined;

    // 尝试从 Accept-Language 头获取
    const headersList = await headers();
    const acceptLanguage = headersList.get('accept-language');

    let locale: Locale = defaultLocale;

    if (localeCookie && locales.includes(localeCookie)) {
        locale = localeCookie;
    } else if (acceptLanguage) {
        // 解析 Accept-Language
        const browserLocale = acceptLanguage.split(',')[0]?.split('-')[0];
        if (browserLocale && locales.includes(browserLocale as Locale)) {
            locale = browserLocale as Locale;
        }
    }

    return {
        locale,
        messages: (await import(`@/messages/${locale}.json`)).default,
    };
});
