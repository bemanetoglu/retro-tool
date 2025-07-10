# Retro Tool - Retrospektif Aracı

Modern ve kullanıcı dostu bir web tabanlı retrospektif aracı. Takımların Mad, Sad, Glad formatında retrospektif toplantıları yapmalarını sağlar.

## 🌟 Özellikler

### 🏢 Oda Yönetimi
- **Oda Oluşturma**: Yeni retrospektif odaları oluşturun
- **6 Haneli Kod**: Her oda için benzersiz 6 haneli kod
- **Davet Linki**: Kolay paylaşım için davet linkleri
- **Katılımcı Sınırı**: İsteğe bağlı katılımcı limiti belirleme
- **Zaman Sınırı**: Retrospektif için zaman sınırı koyma

### 👥 Katılımcı Yönetimi
- **Gerçek Zamanlı Takip**: Katılımcı sayısının canlı takibi
- **Oturum Tabanlı**: Aynı kullanıcı farklı sekmelerden katılsa bile tek sayılır
- **Otomatik Çıkış**: Sekme kapatıldığında otomatik çıkış
- **Kullanıcı Adı Kontrolü**: Aynı odada benzersiz kullanıcı adları

### 💬 Retrospektif Özellikleri
- **Mad, Sad, Glad**: Üç kategori için giriş yapma
- **Gerçek Zamanlı**: Tüm girdiler anlık görünür
- **Kullanıcı Takibi**: Her girişin hangi kullanıcı tarafından yapıldığını gösterir
- **Seçim Sistemi**: Oda sahibi Excel'e dahil edilecek girdileri seçebilir

### ⏰ Zaman Yönetimi
- **Geri Sayım**: Zaman sınırı olan odalarda geri sayım
- **Zaman Uzatma**: Oda sahibi zamanı uzatabilir
- **Oda Yeniden Açma**: Zaman sınırını kaldırıp odayı yeniden açabilir
- **Otomatik Uyarı**: Zaman dolduğunda otomatik uyarı

### 📊 Excel Export
- **Seçili Girdiler**: Sadece seçili girdileri Excel'e aktar
- **Tarih Başlığı**: Retrospektif tarihi ile başlık
- **Kategori Bilgisi**: Mad, Sad, Glad kategorileri dahil
- **Kullanıcı Bilgisi**: Hangi kullanıcı tarafından yazıldığı dahil

### 🔗 Gerçek Zamanlı İletişim
- **WebSocket**: Socket.io kullanarak gerçek zamanlı güncellemeler
- **Otomatik Yeniden Bağlantı**: Bağlantı koptuğunda otomatik yeniden bağlanma
- **Canlı Bildirimler**: Giriş, çıkış ve güncelleme bildirimleri

## 🛠️ Kurulum

### Gereksinimler
- Node.js (v14 veya üzeri)
- npm (Node Package Manager)

### Adımlar

1. **Projeyi İndirin**
   ```bash
   git clone <repository-url>
   cd retro-tool
   ```

2. **Bağımlılıkları Yükleyin**
   ```bash
   npm install
   ```

3. **Uygulamayı Çalıştırın**
   ```bash
   npm start
   ```

4. **Tarayıcıda Açın**
   ```
   http://localhost:3000
   ```

## 🚀 Kullanım

### Oda Oluşturma
1. Ana sayfada "Yeni Oda Oluştur" butonuna tıklayın
2. Oda adını girin (zorunlu)
3. İsteğe bağlı olarak katılımcı sınırı ve zaman sınırı belirleyin
4. "Oda Oluştur" butonuna tıklayın
5. Oluşturulan oda kodunu ve davet linkini paylaşın

### Odaya Katılma
1. Ana sayfada oda kodunu ve kullanıcı adınızı girin
2. "Katıl" butonuna tıklayın
3. Alternatif olarak davet linkini kullanabilirsiniz

### Retrospektif Yapma
1. Mad, Sad, Glad kategorilerinden birine tıklayın
2. Düşüncelerinizi metin kutusuna yazın
3. "Ekle" butonuna tıklayın
4. Girişiniz tüm katılımcılara gerçek zamanlı olarak görünür

### Excel Export (Oda Sahibi)
1. İstediğiniz girişlerin yanındaki checkbox'ları işaretleyin
2. "Excel İndir" butonuna tıklayın
3. Dosya otomatik olarak indirilir

## 📁 Proje Yapısı

```
retro-tool/
├── server.js              # Ana sunucu dosyası
├── package.json            # Proje bağımlılıkları
├── README.md              # Bu dosya
└── public/                # Statik dosyalar
    ├── index.html         # Ana sayfa
    ├── create-room.html   # Oda oluşturma sayfası
    ├── join.html          # Odaya katılma sayfası
    ├── room.html          # Oda sayfası
    ├── css/
    │   └── style.css      # Stil dosyası
    └── js/
        ├── common.js      # Ortak JavaScript fonksiyonları
        ├── index.js       # Ana sayfa JavaScript
        ├── create-room.js # Oda oluşturma JavaScript
        ├── join.js        # Odaya katılma JavaScript
        └── room.js        # Oda sayfası JavaScript
```

## 🔧 Yapılandırma

### Sunucu Portu
Varsayılan olarak uygulama 3000 portunda çalışır. Farklı bir port kullanmak için:

```bash
PORT=8080 npm start
```

### Oturum Süresi
Oturum süresi varsayılan olarak 24 saattir. `server.js` dosyasında değiştirilebilir:

```javascript
cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 saat
```

### Temizlik Aralığı
Boş odalar varsayılan olarak 10 dakika sonra silinir. `server.js` dosyasında değiştirilebilir:

```javascript
setTimeout(() => {
    // ...
}, 10 * 60 * 1000); // 10 dakika
```

## 🎨 Özelleştirme

### CSS Stilleri
`public/css/style.css` dosyasını düzenleyerek görünümü özelleştirebilirsiniz.

### Dil Desteği
Uygulama Türkçe olarak geliştirilmiştir. Farklı diller için JavaScript dosyalarındaki metinler güncellenmelidir.

### Kategoriler
Mad, Sad, Glad kategorileri sabit kodlanmıştır. Farklı kategoriler için `server.js` ve frontend dosyalarında değişiklik yapmanız gerekir.

## 🔍 Sorun Giderme

### Bağlantı Sorunları
- WebSocket bağlantısı kopuyorsa, otomatik yeniden bağlantı çalışacaktır
- Sunucu yeniden başlatıldığında tüm odalar silinir (bellek tabanlı)

### Performans
- Uygulama 100 eş zamanlı oda ve 20 katılımcı/oda için optimize edilmiştir
- Daha fazla yük için kümeleme (clustering) kullanılması önerilir

### Güvenlik
- XSS koruması için tüm kullanıcı girdileri temizlenir
- Oda kodları benzersizdir ve tahmin edilmesi zordur

## 🚀 Geliştirme

### Geliştirme Modu
```bash
npm run dev
```

Bu komut nodemon kullanarak dosya değişikliklerinde otomatik yeniden başlatma sağlar.

### Yeni Özellik Ekleme
1. `server.js` dosyasına API endpoint'i ekleyin
2. Frontend JavaScript dosyalarına istemci kodunu ekleyin
3. Gerekirse HTML ve CSS güncelleyin

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -am 'Yeni özellik eklendi'`)
4. Branch'inizi push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🎯 Örnek İş Akışı

### Takım Lideri Olarak
1. Yeni oda oluşturun: "Sprint 5 Retrospektifi"
2. 30 dakika zaman sınırı belirleyin
3. Katılımcı sınırını 10 olarak ayarlayın
4. Oda kodunu takıma paylaşın
5. Retrospektif sırasında girişleri takip edin
6. Önemli girdileri seçin ve Excel'e aktarın

### Takım Üyesi Olarak
1. Aldığınız oda kodunu girin
2. Kullanıcı adınızı belirleyin
3. Mad, Sad, Glad kategorilerine düşüncelerinizi yazın
4. Diğer üyelerin girişlerini okuyun
5. Zaman dolduğunda retrospektifi tamamlayın

## 📊 Teknik Detaylar

### Teknolojiler
- **Backend**: Node.js, Express.js
- **WebSocket**: Socket.io
- **Session**: express-session
- **Excel**: ExcelJS
- **Frontend**: Vanilla JavaScript, HTML5, CSS3

### Veri Yapısı
```javascript
{
  roomCode: "123456",
  name: "Sprint Retro",
  creator: "session-id",
  participants: Map(),
  entries: {
    mad: [],
    sad: [],
    glad: []
  },
  timeLimit: 30,
  createdAt: 1234567890
}
```

### API Endpoints
- `POST /api/create-room` - Oda oluşturma
- `POST /api/join-room` - Odaya katılma
- `GET /api/room/:code` - Oda bilgileri
- `POST /api/room/:code/entry` - Giriş ekleme
- `POST /api/room/:code/extend-time` - Zaman uzatma
- `POST /api/room/:code/reopen` - Oda yeniden açma
- `POST /api/room/:code/toggle-entry` - Giriş seçimi
- `GET /api/room/:code/export` - Excel export

Bu uygulama, takımların etkili retrospektif toplantıları yapmalarını sağlayacak kapsamlı bir çözümdür. Geliştirme ve özelleştirme için açık kaynak kodludur. 