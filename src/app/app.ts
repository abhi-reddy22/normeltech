import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroVideo') heroVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('mainContent') mainContent!: ElementRef<HTMLElement>;
  currentYear = new Date().getFullYear();

  videos = ['assets/video1.mp4', 'assets/video2.mp4', 'assets/video3.mp4', 'assets/video4.mp4'];
  currentVideoIndex = 0;
  isMenuOpen = false;
  touchStartX = 0;
  touchEndX = 0;
  isPlaying = true;
  videoProgress = 0;
  activeSection = 'home';
  private isScrolling = false;

  private _videoCleanup: (() => void) | null = null;
  private _progressInterval: any = null;

  ngOnInit() { }

  ngAfterViewInit() {
    const video = this.heroVideo.nativeElement;
    
    // Add scroll listener to main content element
    if (this.mainContent) {
      this.mainContent.nativeElement.addEventListener('scroll', this.onScroll.bind(this), { passive: true });
    }

    // iOS-safe setup before play
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.muted = true;
    video.setAttribute('muted', '');
    video.autoplay = true;
    video.preload = 'auto';
    video.loop = this.videos.length === 1;
    video.src = this.videos[this.currentVideoIndex];

    const tryPlay = async () => {
      try {
        await video.play();
        this.isPlaying = true;
        this.startProgressTracking();
      } catch {
        this.isPlaying = false;
        // Autoplay blocked — add fallback for user gesture
        const playOnGesture = () => {
          video.play().then(() => {
            this.isPlaying = true;
            this.startProgressTracking();
          }).catch(() => { });
          window.removeEventListener('touchstart', playOnGesture);
          window.removeEventListener('click', playOnGesture);
        };
        window.addEventListener('touchstart', playOnGesture, { once: true, passive: true });
        window.addEventListener('click', playOnGesture, { once: true, passive: true });
      }
    };

    const setupVideo = () => {
      if (!video.loop) video.onended = () => this.nextVideo();
      else video.onended = null;
      tryPlay();
    };

    if (video.readyState >= 2) setupVideo();
    else video.addEventListener('loadeddata', setupVideo, { once: true });

    // Retry if user switches back to tab
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && this.isPlaying) {
        video.play().catch(() => { });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Handle play/pause events
    video.addEventListener('play', () => {
      this.isPlaying = true;
      this.startProgressTracking();
    });

    video.addEventListener('pause', () => {
      this.isPlaying = false;
      this.stopProgressTracking();
    });

    // Handle mobile connection changes - use lower quality or pause if needed
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        const handleConnectionChange = () => {
          if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
            // On slow connections, pause video to save data
            video.pause();
          }
        };
        connection.addEventListener('change', handleConnectionChange);
      }
    }

    this._videoCleanup = () => {
      document.removeEventListener('visibilitychange', onVisibility);
      video.onended = null;
      this.stopProgressTracking();
    };
  }

  // Navigation
  onScroll() {
    if (!this.mainContent || this.isScrolling) return;
    
    const sections = ['home', 'about', 'services', 'contact'];
    const scrollPosition = this.mainContent.nativeElement.scrollTop + 100; // Offset for navbar height

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const offsetTop = element.offsetTop;
        const offsetBottom = offsetTop + element.offsetHeight;

        if (scrollPosition >= offsetTop && scrollPosition < offsetBottom) {
          this.activeSection = section;
          break;
        }
      }
    }
  }

  scrollTo(id: string) {
    this.activeSection = id;
    this.isScrolling = true;
    
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    
    // Re-enable scroll detection after smooth scroll completes (typically ~500-1000ms)
    setTimeout(() => {
      this.isScrolling = false;
    }, 1000);
  }
  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
  closeMenu() {
    this.isMenuOpen = false;
  }
  scrollToAndClose(id: string) {
    this.scrollTo(id);
    this.closeMenu();
  }

  // Playlist Controls
  nextVideo() {
    const next = (this.currentVideoIndex + 1) % this.videos.length;
    this.changeVideo(next);
  }
  prevVideo() {
    const prev = (this.currentVideoIndex - 1 + this.videos.length) % this.videos.length;
    this.changeVideo(prev);
  }
  selectVideo(i: number) {
    this.changeVideo(i);
  }

  changeVideo(index: number) {
    if (index === this.currentVideoIndex) return;
    this.currentVideoIndex = index;

    const video = this.heroVideo.nativeElement;
    
    // Stop progress tracking during transition
    this.stopProgressTracking();
    this.videoProgress = 0;
    
    // Add smooth fade transition
    video.style.opacity = '0.5';
    
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.muted = true;
    video.autoplay = true;
    video.preload = 'auto';
    video.loop = this.videos.length === 1;
    video.src = this.videos[index];
    video.load();

    video.addEventListener(
      'loadeddata',
      async () => {
        // Restore opacity with smooth transition
        video.style.transition = 'opacity 0.5s ease-in-out';
        video.style.opacity = '1';
        
        try {
          await video.play();
          this.isPlaying = true;
          this.startProgressTracking();
        } catch {
          this.isPlaying = false;
          const playOnGesture = () => {
            video.play().then(() => {
              this.isPlaying = true;
              this.startProgressTracking();
            }).catch(() => { });
            window.removeEventListener('touchstart', playOnGesture);
            window.removeEventListener('click', playOnGesture);
          };
          window.addEventListener('touchstart', playOnGesture, { once: true, passive: true });
          window.addEventListener('click', playOnGesture, { once: true, passive: true });
        }
      },
      { once: true }
    );
  }

  // Toggle play/pause
  togglePlayPause() {
    const video = this.heroVideo.nativeElement;
    if (this.isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {
        // Handle autoplay restrictions
        console.log('Playback prevented by browser');
      });
    }
  }

  // Start tracking video progress
  startProgressTracking() {
    this.stopProgressTracking(); // Clear any existing interval
    
    this._progressInterval = setInterval(() => {
      const video = this.heroVideo.nativeElement;
      if (video.duration > 0) {
        this.videoProgress = (video.currentTime / video.duration) * 100;
      }
    }, 100); // Update every 100ms for smooth progress
  }

  // Stop tracking video progress
  stopProgressTracking() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }
  }

  // Swipe gesture
  onTouchStart(e: TouchEvent) {
    this.touchStartX = e.changedTouches[0].screenX;
  }
  onTouchEnd(e: TouchEvent) {
    this.touchEndX = e.changedTouches[0].screenX;
    if (this.touchEndX < this.touchStartX - 50) this.nextVideo();
    if (this.touchEndX > this.touchStartX + 50) this.prevVideo();
  }

  ngOnDestroy() {
    if (this._videoCleanup) this._videoCleanup();
    this.stopProgressTracking();
    if (this.mainContent) {
      this.mainContent.nativeElement.removeEventListener('scroll', this.onScroll.bind(this));
    }
  }
}
