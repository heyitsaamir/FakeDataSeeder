import { MockMessage } from "../../services/types";
import { Sanitizer } from "../sanitizer";
interface RedditCommentData {
  id: string;
  body: string;
  body_html: string;
  created_utc: number;
  author: string;
  replies: RedditBaseComment | "";
}

interface RedditComment<T extends RedditCommentData = RedditCommentData> {
  kind: "t1" | "t3";
  data: T;
}
interface RedditBaseComment {
  kind: "Listing";
  data: {
    children: RedditComment[];
  };
}

type BaseComment = RedditComment<
  RedditCommentData & {
    selftext: string;
    title: string;
    selftext_html: string;
  }
>;

interface BasePost extends RedditBaseComment {
  kind: "Listing";
  data: {
    children: BaseComment[];
  };
}

export type RedditComments = [BasePost, RedditBaseComment];

export const RedditSanitizer: Sanitizer<RedditComments> = {
  sanitize(raw: RedditComments): MockMessage[] {
    const buildMockMessageFromBaseComment = (
      parentId: string,
      baseComment: RedditBaseComment
    ): MockMessage[] => {
      const acc: MockMessage[] = [];
      baseComment.data.children.forEach((comment) => {
        acc.push({
          id: comment.data.id,
          content: comment.data.body,
          userId: comment.data.author,
          parentId: parentId,
          timestamp: comment.data.created_utc,
        });
        if (comment.data.replies) {
          acc.push(
            ...buildMockMessageFromBaseComment(
              comment.data.id,
              comment.data.replies
            )
          );
        }
      });
      return acc;
    };

    const [initialPost, replies] = raw;

    return [
      {
        id: initialPost.data.children[0].data.id,
        content: initialPost.data.children[0].data.title,
        userId: initialPost.data.children[0].data.author,
        parentId: undefined,
        timestamp: initialPost.data.children[0].data.created_utc,
      },
      ...buildMockMessageFromBaseComment(
        initialPost.data.children[0].data.id,
        replies
      ),
    ].sort((a, b) => a.timestamp - b.timestamp);
  },
};
