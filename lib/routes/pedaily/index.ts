import { Route } from '@/types';

import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/news',
    categories: ['new-media'],
    example: '/pedaily/news',
    url: 'pedaily.cn',
    name: '最新',
    maintainers: ['p3psi-boo'],
    radar: [
        {
            source: ['www.pedaily.cn'],
            target: '/pedaily/news',
        },
    ],
    handler,
};

async function handler() {
    const url = 'https://www.pedaily.cn/all';

    const response = await got({
        method: 'get',
        url,
    });

    const $ = load(response.data);

    const list = $('.news-list li')
        .toArray()
        .map((item) => {
            const $item = $(item);
            const $link = $item.find('.txt h3 a').last();

            const link = $link.attr('href') || '';
            const title = $link.text();
            const description = $item.find('.desc').text();
            const category = $item.find('.s a').text();
            const author = $item.find('.author a').last().text();
            const pubDate = $item.find('.date').text();

            return {
                title,
                link,
                description,
                category,
                author,
                pubDate: parseDate(pubDate),
            };
        });

    const items = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const articleResponse = await got({
                    method: 'get',
                    url: item.link,
                });

                const $article = load(articleResponse.data);

                item.description = $article('#news-content').html() || item.description;
                return item;
            })
        )
    );

    return {
        title: '最新 - 投资界',
        link: url,
        item: items,
    };
}
