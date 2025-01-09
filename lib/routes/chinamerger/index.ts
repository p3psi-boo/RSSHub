import { Route } from '@/types';

import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import { ofetch } from 'ofetch';

export const route: Route = {
    path: '/news',
    categories: ['finance'],
    example: '/chinamerger/news',
    name: '并购资讯',
    maintainers: ['p3psi-boo'],
    handler,
};

async function handler() {
    const url = 'https://www.chinamerger.com/chinaMerger/website/newsAction!list.action';
    const params = {
        sort: 'zx',
        siteId: 8,
        channelFlag: 'info',
        isParent: false,
        lastIndex: 0,
        pageSize: 26,
        page: 1,
    };

    const response = await ofetch(url, { params });

    const _list = response.data.rows;
    const list = _list.map((item) => ({
        link: 'https://mw.chinamerger.com/' + item.url,
        title: item.title,
        pubDate: parseDate(item.pubDate),
    }));

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const content = load(detailResponse.data);
                item.description = content('.content').html();

                return item;
            })
        )
    );

    return {
        title: '并购资讯 - 晨哨',
        link: url,
        item: items,
    };
}
