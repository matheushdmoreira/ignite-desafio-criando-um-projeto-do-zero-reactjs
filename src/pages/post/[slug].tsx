import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Prismic from '@prismicio/client';
import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import Head from 'next/head';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Comments from '../../components/Comments';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface ResultsData {
  data: {
    title: string;
  };
  uid: string;
}

interface Page {
  title?: string;
  uid?: string;
}

interface PreviewDataProps {
  ref: string;
}

interface PreviewProps {
  params: ParsedUrlQuery;
  preview: boolean;
  previewData?: PreviewDataProps | null;
}

interface PostProps {
  post: Post;
  results: ResultsData[];
  preview: boolean;
}

interface PostProps {
  post: Post;
}

export default function Post({
  post,
  results,
  preview,
}: PostProps): JSX.Element {
  const { last_publication_date } = post;
  const [page, setPage] = useState<Page[]>([
    { title: null, uid: null },
    { title: null, uid: null },
  ]);

  const router = useRouter();

  useEffect(() => {
    const arrayPosts = results.map(posts => {
      return {
        title: posts.data.title,
        uid: posts.uid,
      };
    });

    const postIndex = arrayPosts.findIndex(
      posts => posts.title === post.data.title
    );

    if (postIndex === 0) {
      setPage([
        { title: null, uid: null },
        {
          title: arrayPosts[postIndex + 1].title,
          uid: arrayPosts[postIndex + 1].uid,
        },
      ]);
      return;
    }
    if (postIndex === arrayPosts.length - 1) {
      setPage([
        {
          title: arrayPosts[postIndex - 1].title,
          uid: arrayPosts[postIndex - 1].uid,
        },
        { title: null, uid: null },
      ]);
      return;
    }

    setPage([
      {
        title: arrayPosts[postIndex - 1].title,
        uid: arrayPosts[postIndex - 1].uid,
      },
      {
        title: arrayPosts[postIndex + 1].title,
        uid: arrayPosts[postIndex + 1].uid,
      },
    ]);
  }, [results, post.data.title]);

  const estimatedReadTime = useMemo(() => {
    if (router.isFallback) {
      return 0;
    }

    const wordsPerMinute = 200;

    const contentWords = post.data.content.reduce(
      (summedContents, currentContent) => {
        const headingWords = currentContent.heading.split(/\s/g).length;
        const bodyWords = currentContent.body.reduce(
          (summedBodies, currentBodies) => {
            const textWords = currentBodies.text.split(/\s/g).length;

            return summedBodies + textWords;
          },
          0
        );

        return summedContents + headingWords + bodyWords;
      },
      0
    );

    const minutes = contentWords / wordsPerMinute;
    const readTime = Math.ceil(minutes);

    return readTime;
  }, [post, router.isFallback]);

  const lastEditPost = useCallback(() => {
    const lastEditDateFormated = format(
      new Date(last_publication_date),
      'dd MMM yyyy',
      {
        locale: ptBR,
      }
    );

    const lastEditHourFormated = format(
      new Date(last_publication_date),
      'HH:mm',
      {
        locale: ptBR,
      }
    );

    const response = `* editado em ${lastEditDateFormated}, às ${lastEditHourFormated}`;

    return response;
  }, [last_publication_date]);

  if (router.isFallback) {
    return <p className={styles.loading}>Carregando...</p>;
  }

  return (
    <>
      <Head>
        <title>{post.data.title} | Spacetraveling</title>
      </Head>

      <div
        className={styles.banner}
        data-testid="banner"
        style={{ backgroundImage: `url(${post.data.banner.url})` }}
      />

      <main className={commonStyles.container}>
        <section className={styles.post}>
          <h2>{post.data.title}</h2>

          <div className={styles.postInfos}>
            <span>
              <FiCalendar size={20} />
              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </span>
            <span>
              <FiUser size={20} />
              {post.data.author}
            </span>
            <span>
              <FiClock size={20} />
              {estimatedReadTime} min
            </span>
          </div>

          <div className={styles.changed}>
            {last_publication_date && <p>{lastEditPost()}</p>}
          </div>

          <article className={styles.postContent}>
            {post.data.content.map(({ heading, body }) => (
              <Fragment key={heading}>
                <h3>{heading}</h3>

                <div
                  // eslint-disable-next-line react/no-danger
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(body),
                  }}
                />
              </Fragment>
            ))}
          </article>

          <div className={styles.navigation}>
            {page[0].title ? (
              <span>
                <h4>{page[0].title}</h4>
                <a href={`/post/${page[0].uid}`}>Post anterior</a>
              </span>
            ) : (
              <span />
            )}

            {page[1].title ? (
              <span>
                <h4>{page[1].title}</h4>
                <a href={`/post/${page[1].uid}`}>Próximo post</a>
              </span>
            ) : (
              <span />
            )}
          </div>

          <Comments />

          {preview && (
            <aside>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
        </section>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'posts'),
  ]);

  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));

  return {
    paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}: PreviewProps) => {
  const prismic = getPrismicClient();
  const { slug } = params;

  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref ?? null,
  });

  const { results } = await prismic.query('', {
    ref: previewData?.ref ?? null,
  });

  const { first_publication_date, data, uid, last_publication_date } = response;

  return {
    props: {
      post: {
        first_publication_date,
        last_publication_date,
        data,
        uid,
      },
      results,
      preview,
    },
  };
};
