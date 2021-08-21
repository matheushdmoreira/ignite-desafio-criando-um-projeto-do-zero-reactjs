import { Fragment, useMemo } from 'react';
import Prismic from '@prismicio/client';
import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import ptBR from 'date-fns/locale/pt-BR';
import { useRouter } from 'next/router';

import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  first_publication_date: string | null;
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

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

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

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();
  const { slug } = context.params;

  const response = await prismic.getByUID('posts', String(slug), {});

  return {
    props: {
      post: response,
    },
  };
};
