export interface KickFeaturedLivestreams {
  data: {
    livestreams: FeaturedLivestream[];
  };
  message: string;
}

export interface FeaturedLivestream {
  id: string;
  title: string;
  viewer_count: number;
  thumbnail: {
    src: string;
    srcset: string;
  };
  start_time: string;
  channel: {
    id: number;
    slug: string;
    profile_pic: string;
    username: string;
  };
  category: {
    id: number;
    name: string;
    slug: string;
  };
  language: string;
  is_mature: boolean;
  tags: string[];
}