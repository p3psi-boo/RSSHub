import { Route } from '@/types';

import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import { ofetch } from 'ofetch';

export const route: Route = {
    path: '/news/:newsType?',
    categories: ['new-media'],
    example: '/leaderobot/news',
    name: '媒体资讯',
    maintainers: ['p3psi-boo'],
    parameters: {
        newsType: '文章分类，见下表，默认是留空',
    },
    description: `
    <details>

    留空为全部

    | newsType | 新闻类型 |
    | -------- | -------- |
    | 48       | 行业新闻 |
    | 144      | 快讯集锦 |
    | 47       | 科技新闻 |
    | 49       | 产业融资 |
    | 50       | 专家专栏 |
    | 124      | 其他     |

    </details>
    `,
    radar: [
        {
            source: ['www.leaderobot.com/news/type-list?newsType=:newsType'],
            target: '/news/:newsType',
        },
    ],
    handler,
};

async function handler(ctx: any) {
    const newsType = ctx.req.param('newsType') || '';

    const url = 'https://www.leaderobot.com/api/front/news/list';
    const params = {
        current: 1,
        pageSize: 10,
        recommend: true,
        newsType,
    };

    const response = await ofetch(url, { params });

    const _list = response.data.items;
    const list = _list.map((item) => ({
        link: 'https://www.leaderobot.com/news/' + item.id,
        title: item.title,
        pubDate: parseDate(item.createTime),
    }));

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const response = await got({
                    method: 'get',
                    url: item.link,
                });
                const $ = load(response.data);
                item.description = $('#content').html();

                return item;
            })
        )
    );

    return {
        title: '立德共创',
        link: url,
        item: items,
    };
}
