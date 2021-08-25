import { GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { format } from 'date-fns';
import { FiCalendar, FiUser } from 'react-icons/fi';
import ptBR from 'date-fns/locale/pt-BR';

import { getPrismicClient } from '../services/prismic';

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface PreviewDataProps {
  ref: string;
}

interface PreviewProps {
  preview: boolean;
  previewData?: PreviewDataProps | null;
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({
  postsPagination,
  preview,
}: HomeProps): JSX.Element {
  const { results, next_page } = postsPagination;

  const [posts, setPosts] = useState<Post[]>(results);
  const [newNextPage, setNewNextPage] = useState(next_page);

  async function handleLoadMorePosts(): Promise<void> {
    await fetch(newNextPage, {
      method: 'get',
    })
      .then(response => response.json())
      .then(data => {
        const newPosts = data.results.map(post => {
          return {
            uid: post.uid,
            first_publication_date: post.first_publication_date,
            data: {
              title: post.data.title,
              subtitle: post.data.subtitle,
              author: post.data.author,
            },
          };
        });

        setPosts(oldPosts => [...oldPosts, ...newPosts]);
        setNewNextPage(data.next_page);
      });
  }

  return (
    <>
      <Head>
        <title>Home | Spacetraveling</title>
      </Head>

      <main className={commonStyles.container}>
        <div className={styles.posts}>
          {posts.map(post => (
            <article key={post.uid}>
              <Link href={`/post/${post.uid}`}>
                <a>
                  <h2>{post.data.title}</h2>
                  <p>{post.data.subtitle}</p>

                  <div className={styles.postContent}>
                    <span style={{ textTransform: 'capitalize' }}>
                      <FiCalendar size={20} />
                      {format(
                        new Date(post.first_publication_date),
                        'dd MMM yyyy',
                        {
                          locale: ptBR,
                        }
                      )}
                    </span>
                    <span>
                      <FiUser size={20} />
                      {post.data.author}
                    </span>
                  </div>
                </a>
              </Link>
            </article>
          ))}

          {!!newNextPage && (
            <button type="button" onClick={handleLoadMorePosts}>
              Carregar mais posts
            </button>
          )}
          {preview && (
            <aside>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )}
        </div>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({
  preview = false,
  previewData,
}: PreviewProps) => {
  const prismic = getPrismicClient();

  const postsResponse = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author'],
      pageSize: 3,
      ref: previewData?.ref ?? null,
    }
  );

  return {
    props: {
      postsPagination: postsResponse,
      preview,
    },
  };
};
