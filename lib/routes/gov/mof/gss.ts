import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import timezone from '@/utils/timezone';
import { parseDate } from '@/utils/parse-date';

const domain = 'gss.mof.gov.cn';

export const route: Route = {
    path: '/mof/gss/:category?',
    categories: ['government'],
    example: '/gov/mof/gss/zhengcefabu',
    name: '关税司',
    maintainers: ['p3psi-boo'],
    parameters: { category: '专题，见下表，默认为政策发布' },
    description: `
| Category | Description |
| -------- | -------- |
| zhengcefabu | 政策发布 |
| zhengcejiedu | 政策解读 |
  `,
    handler,
};

async function handler(ctx) {
    const { category = 'zhengcefabu' } = ctx.req.param();
    const currentUrl = `https://${domain}/gzdt/${category}/`;
    const { data: response } = await got(currentUrl);
    const $ = load(response);
    const title = $('title').text();
    const author = $('div.zzName').text();
    const siteName = $('meta[name="SiteName"]').prop('content');
    const description = $('meta[name="ColumnDescription"]').prop('content');
    const indexes = $('ul.liBox li')
        .toArray()
        .map((li) => {
            const a = $(li).find('a');
            const pubDate = $(li).find('span').text();
            const href = a.prop('href');
            const link = href.startsWith('http') ? href : new URL(href, currentUrl).href;
            return {
                title: a.prop('title'),
                link,
                pubDate: timezone(parseDate(pubDate), +8),
            };
        });

    const items = await Promise.all(
        indexes.map((item) =>
            cache.tryGet(item.link, async () => {
                const { data: detailResponse } = await got(item.link);
                const content = load(detailResponse);
                item.description = content('div.my_conboxzw').html();
                item.author = author;
                return item;
            })
        )
    );

    return {
        item: items,
        title,
        link: currentUrl,
        description: `${description} - ${siteName}`,
        author,
    };
}
