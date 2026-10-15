"use client";

import { useState, type ReactNode } from "react";
import { Accordion } from "@/components/ui/accordion";
import { AppImage } from "@/components/ui/app-image";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Icon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/ui/logo";
import { PhoneInput } from "@/components/ui/phone-input";
import { PriceTag } from "@/components/ui/price-tag";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { IMAGE_PRESET_NAMES, IMAGE_PRESETS } from "@/lib/images/presets";
import type { ImageAsset } from "@/lib/images/loader";

// Trang này CHỈ để xem và thử component. Hover: rê chuột; focus: bấm Tab; thu nhỏ cửa sổ dưới
// 768px để xem bottom sheet và bố cục mobile.

const SECTIONS = [
  ["mau", "Màu, chữ, bo góc, bóng"],
  ["button", "Button, IconButton"],
  ["chip-badge", "Chip, Badge"],
  ["price", "PriceTag"],
  ["quantity", "QuantityStepper"],
  ["form", "Ô nhập liệu"],
  ["dialog", "Dialog, Drawer"],
  ["toast", "Toast"],
  ["feedback", "Skeleton, EmptyState"],
  ["nav", "Breadcrumb, Tabs, Accordion, SegmentedControl"],
  ["sticky", "StickyActionBar, Logo"],
  ["image", "AppImage"],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4 py-8">
      <h2 id={`${id}-title`} className="text-category-title mb-5 border-b border-border pb-2">
        {title}
      </h2>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}

function Demo({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div>
      <p className="mb-2 text-caption text-muted">{label}</p>
      <div className={className ?? "flex flex-wrap items-center gap-3"}>{children}</div>
    </div>
  );
}

const COLOR_TOKENS = [
  ["brand", "bg-brand"],
  ["brand-dark", "bg-brand-dark"],
  ["primary", "bg-primary"],
  ["primary-soft", "bg-primary-soft"],
  ["primary-softer", "bg-primary-softer"],
  ["sale", "bg-sale"],
  ["sale-soft", "bg-sale-soft"],
  ["badge-discount", "bg-badge-discount-bg"],
  ["danger", "bg-danger"],
  ["success", "bg-success"],
  ["success-soft", "bg-success-soft"],
  ["text", "bg-text"],
  ["text-2", "bg-text-2"],
  ["muted", "bg-muted"],
  ["faint", "bg-faint"],
  ["border", "bg-border"],
  ["surface", "bg-surface"],
  ["page-bg", "bg-page-bg"],
] as const;

// Ảnh "có bản" để thử đường đi qua custom loader (chưa có pipeline thật): trỏ vào ảnh giữ chỗ.
const DEMO_ASSET: ImageAsset = {
  width: 480,
  height: 480,
  variants: {
    "product-card": {
      "320": "/placeholders/product.svg?w=320",
      "480": "/placeholders/product.svg?w=480",
    },
  },
};

function ColorsAndType() {
  return (
    <Section id="mau" title="Màu, chữ, bo góc, bóng">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {COLOR_TOKENS.map(([name, swatch]) => (
          <div key={name} className="overflow-hidden rounded-card border border-border bg-surface">
            <div className={`h-10 ${swatch}`} />
            <p className="px-2 py-1 text-caption">{name}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
        <p className="text-page-title">Tiêu đề trang 28/600</p>
        <p className="text-category-title">Tiêu đề danh mục 20/600</p>
        <p className="text-product-title">Tên sản phẩm chi tiết 18/600</p>
        <p className="text-block-title">Tiêu đề khối 18/700</p>
        <p className="text-price-xl text-sale">22.900đ giá lớn 28/700</p>
        <p className="text-nav-link">Liên kết header 15/500</p>
        <p className="text-sidebar-item">Mục sidebar 14/400</p>
        <p className="text-card-name">Tên sản phẩm trên thẻ 14/400</p>
        <p className="text-price-card text-sale">22.900đ giá thẻ 16/700</p>
        <p className="text-price-sub text-faint">Giá gốc 11/400</p>
        <p className="text-button">Chữ nút 15/600</p>
        <p className="text-caption">Chú thích 12/500</p>
        <p lang="vi">Bảng chữ Việt: Ăn quả nhớ kẻ trồng cây, ơ ư ê ô ạ ặ ậ ẹ ệ ị ọ ộ ợ ụ ự ỵ.</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="flex h-16 w-28 items-center justify-center rounded-badge border border-border bg-surface text-caption">
          bo 4
        </div>
        <div className="flex h-16 w-28 items-center justify-center rounded-card border border-border bg-surface text-caption">
          bo 8
        </div>
        <div className="flex h-16 w-28 items-center justify-center rounded-banner border border-border bg-surface text-caption">
          bo 12
        </div>
        <div className="flex h-16 w-28 items-center justify-center rounded-pill border border-border bg-surface text-caption">
          bo tròn
        </div>
        <div className="flex h-16 w-28 items-center justify-center rounded-card bg-surface text-caption shadow-dropdown">
          bóng dropdown
        </div>
        <div className="flex h-16 w-28 items-center justify-center rounded-card bg-surface text-caption shadow-account">
          bóng tài khoản
        </div>
      </div>
    </Section>
  );
}

function Buttons() {
  const [loading, setLoading] = useState(false);
  const variants = ["primary", "soft", "outline", "ghost", "danger"] as const;
  const sizes = ["sm", "md", "lg"] as const;

  function fakeSubmit() {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  }

  return (
    <Section id="button" title="Button, IconButton">
      {sizes.map((size) => (
        <Demo key={size} label={`Button cỡ ${size}: mặc định · có icon · disabled · loading`}>
          {variants.map((variant) => (
            <div key={variant} className="flex flex-col items-start gap-2">
              <Button variant={variant} size={size}>
                {variant}
              </Button>
              <Button variant={variant} size={size} leftIcon={<Icon name="cart" />}>
                Mua
              </Button>
              <Button variant={variant} size={size} disabled>
                Disabled
              </Button>
              <Button variant={variant} size={size} loading>
                Đang gửi
              </Button>
            </div>
          ))}
        </Demo>
      ))}
      <Demo label="Bấm để thử trạng thái loading (2 giây, nút giữ focus, không bấm lặp được)">
        <Button loading={loading} onClick={fakeSubmit} loadingLabel="Đang đặt hàng">
          Đặt hàng
        </Button>
        <Button fullWidth variant="outline" className="max-w-xs">
          Chiếm hết chiều rộng
        </Button>
      </Demo>
      <Demo label="IconButton (bắt buộc có label → aria-label): ghost · soft · outline · dark; sm/md/lg; disabled; loading">
        {(["ghost", "soft", "outline"] as const).map((variant) => (
          <IconButton key={variant} variant={variant} label="Xóa" icon={<Icon name="trash" />} />
        ))}
        <span className="rounded-card bg-brand-dark p-2">
          <IconButton
            variant="dark"
            label="Sản phẩm kế tiếp"
            icon={<Icon name="chevron-right" />}
          />
        </span>
        <IconButton size="sm" label="Thêm" icon={<Icon name="plus" />} variant="soft" />
        <IconButton size="lg" label="Thêm" icon={<Icon name="plus" />} variant="soft" />
        <IconButton
          disabled
          label="Xóa (không dùng được)"
          icon={<Icon name="trash" />}
          variant="outline"
        />
        <IconButton loading label="Đang xóa" icon={<Icon name="trash" />} variant="outline" />
      </Demo>
    </Section>
  );
}

function ChipsAndBadges() {
  const [sort, setSort] = useState("khuyen-mai");
  const [recent, setRecent] = useState(["mì gói", "sữa tươi", "trứng gà"]);
  return (
    <Section id="chip-badge" title="Chip, Badge">
      <Demo label="Chip chọn một (sắp xếp): bấm để đổi; có chip disabled">
        {[
          ["khuyen-mai", "Khuyến mãi"],
          ["gia-tang", "Giá thấp đến cao"],
          ["gia-giam", "Giá cao đến thấp"],
          ["ban-chay", "Bán chạy"],
        ].map(([id, label]) => (
          <Chip key={id} selected={sort === id} onClick={() => setSort(id ?? "")}>
            {label}
          </Chip>
        ))}
        <Chip disabled onClick={() => undefined}>
          Không dùng được
        </Chip>
        <Chip>Chỉ là nhãn</Chip>
      </Demo>
      <Demo label="Chip có nút xóa (tìm kiếm gần đây)">
        {recent.map((term) => (
          <Chip
            key={term}
            onClick={() => undefined}
            onRemove={() => setRecent((items) => items.filter((item) => item !== term))}
            removeLabel={`Xóa "${term}"`}
          >
            {term}
          </Chip>
        ))}
        {recent.length === 0 && <span className="text-sm text-muted">Đã xóa hết</span>}
      </Demo>
      <Demo label="Badge: discount (-23%) · danger lớn (-23%) · sale · success · primary · neutral · số giỏ hàng">
        <Badge tone="discount" size="md">
          -23%
        </Badge>
        <Badge tone="danger" size="lg">
          -37%
        </Badge>
        <Badge tone="sale">Chờ thanh toán</Badge>
        <Badge tone="success">Còn hàng</Badge>
        <Badge tone="primary">Đang chuẩn bị</Badge>
        <Badge tone="neutral">Đã hủy</Badge>
        <Badge tone="danger">Chỉ còn 3</Badge>
        <Badge tone="danger" count>
          3
        </Badge>
        <Badge tone="danger" count>
          99+
        </Badge>
      </Demo>
    </Section>
  );
}

function Prices() {
  return (
    <Section id="price" title="PriceTag">
      <Demo
        label="Thẻ sản phẩm: có giảm giá · không giảm giá · tiết kiệm lẻ 13,5K · tiết kiệm dưới 1K"
        className="flex flex-wrap items-start gap-8"
      >
        <PriceTag price={22900} originalPrice={29900} />
        <PriceTag price={22900} />
        <PriceTag price={36500} originalPrice={50000} />
        <PriceTag price={9500} originalPrice={10000} />
      </Demo>
      <Demo
        label="Giá lớn ở trang chi tiết + đơn giá quy đổi"
        className="flex flex-wrap items-start gap-8"
      >
        <PriceTag variant="large" price={17000} originalPrice={27000} />
        <PriceTag
          variant="large"
          price={17000}
          originalPrice={27000}
          unitPrice={{ amount: 13500, unit: "gói" }}
        />
        <PriceTag variant="large" price={17000} />
      </Demo>
      <Demo
        label="Giỏ hàng / checkout (viết liền, tiết kiệm đầy đủ 7.000đ)"
        className="flex flex-wrap items-start gap-8"
      >
        <PriceTag variant="inline" price={22900} originalPrice={29900} />
        <PriceTag variant="inline" price={22900} />
        <PriceTag variant="inline" price={1250000} originalPrice={1300000} savings="short" />
      </Demo>
    </Section>
  );
}

function Quantities() {
  const [card, setCard] = useState(1);
  const [cart, setCart] = useState(2);
  const [loading, setLoading] = useState(false);
  const [maxed, setMaxed] = useState(3);

  function changeWithLatency(next: number) {
    setLoading(true);
    setTimeout(() => {
      setCart(next);
      setLoading(false);
    }, 800);
  }

  return (
    <Section id="quantity" title="QuantityStepper">
      <Demo
        label="Thẻ sản phẩm (min 0: về 0 thì quay lại nút Mua), rộng 191px"
        className="flex flex-wrap items-start gap-8"
      >
        <div className="w-[191px]">
          {card === 0 ? (
            <Button
              variant="soft"
              fullWidth
              leftIcon={<Icon name="cart" />}
              onClick={() => setCard(1)}
            >
              Mua
            </Button>
          ) : (
            <QuantityStepper
              variant="card"
              label="Cà chua bi"
              value={card}
              min={0}
              max={5}
              onChange={setCard}
            />
          )}
        </div>
      </Demo>
      <Demo
        label="Giỏ hàng: mặc định · đang gửi lên server (bấm thử, 0,8 giây) · đã tới tồn tối đa · hết tồn (khóa) · lỗi · disabled"
        className="flex flex-wrap items-start gap-8"
      >
        <QuantityStepper
          label="Sữa tươi"
          value={cart}
          max={10}
          onChange={changeWithLatency}
          loading={loading}
        />
        <QuantityStepper label="Mì gói" value={maxed} max={3} onChange={setMaxed} />
        <QuantityStepper label="Trứng gà" value={0} min={0} max={0} onChange={() => undefined} />
        <QuantityStepper
          label="Bánh quy"
          value={5}
          max={2}
          onChange={() => undefined}
          error="Chỉ còn 2 sản phẩm"
        />
        <QuantityStepper label="Dầu ăn" value={1} onChange={() => undefined} disabled />
      </Demo>
    </Section>
  );
}

function Forms() {
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [province, setProvince] = useState("");
  const phoneError =
    phone.length > 0 && phone.length < 9 ? "SĐT chưa đủ số, bạn kiểm tra lại nhé" : undefined;

  return (
    <Section id="form" title="Ô nhập liệu">
      <div className="grid gap-5 md:grid-cols-2">
        <Input label="Họ và tên" placeholder="Nguyễn Văn A" autoComplete="name" required />
        <Input
          label="Email"
          hint="Chúng tôi chỉ dùng để gửi hóa đơn"
          placeholder="ban@vi-du.vn"
          type="email"
        />
        <Input
          label="Mã giảm giá (có lỗi)"
          defaultValue="ABC"
          error="Mã không tồn tại hoặc đã hết hạn"
        />
        <Input label="Ô bị khóa" defaultValue="Không sửa được" disabled />
        <Input label="Đang kiểm tra" defaultValue="0901234567" loading />
        <Input
          label="Tìm kiếm"
          hideLabel
          placeholder="Tìm sản phẩm..."
          startAdornment={<Icon name="info" />}
        />
        <PhoneInput
          label="Số điện thoại"
          value={phone}
          onValueChange={setPhone}
          placeholder="901234567"
          required
          error={phoneError}
          hint="Nhập thử ít hơn 9 số để thấy lỗi"
        />
        <PhoneInput
          label="Số điện thoại (khóa)"
          value="901234567"
          onValueChange={() => undefined}
          disabled
        />
        <Select
          label="Tỉnh/thành"
          placeholder="Chọn tỉnh/thành"
          value={province}
          onChange={(event) => setProvince(event.target.value)}
          required
        >
          <option value="hcm">TP. Hồ Chí Minh</option>
          <option value="hn">Hà Nội</option>
          <option value="dn">Đà Nẵng</option>
        </Select>
        <Select
          label="Phường/xã (có lỗi)"
          placeholder="Chọn phường/xã"
          error="Bạn chưa chọn phường/xã"
          defaultValue=""
        >
          <option value="p1">Phường 1</option>
        </Select>
        <Select
          label="Đang nạp danh sách"
          placeholder="Đang nạp..."
          loading
          defaultValue=""
          disabled
        >
          <option value="x">x</option>
        </Select>
        <Select label="Ô chọn bị khóa" disabled defaultValue="a">
          <option value="a">Giá trị cố định</option>
        </Select>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Textarea
          label="Ghi chú cho người giao"
          placeholder="Ví dụ: gọi trước khi giao"
          maxLength={300}
          currentLength={note.length}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <Textarea label="Ghi chú (có lỗi)" defaultValue="..." error="Ghi chú quá ngắn" />
      </div>
      <div className="flex flex-col gap-4">
        <Checkbox
          label="Tôi xác nhận đủ 18 tuổi"
          checked={agree}
          onChange={(event) => setAgree(event.target.checked)}
        />
        <Checkbox label="Đã đánh dấu sẵn" defaultChecked />
        <Checkbox label="Bị khóa" disabled />
        <Checkbox label="Đồng ý Điều khoản (có lỗi)" error="Bạn cần đồng ý để tiếp tục" />
      </div>
    </Section>
  );
}

function Dialogs() {
  const [center, setCenter] = useState(false);
  const [right, setRight] = useState(false);
  const [cart, setCart] = useState(false);
  const [left, setLeft] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const toast = useToast();

  return (
    <Section id="dialog" title="Dialog, Drawer">
      <Demo label="ResponsiveDialog: modal giữa màn hình ở desktop, bottom sheet ở mobile (< 768px)">
        <Button variant="outline" onClick={() => setCenter(true)}>
          Mở dialog giữa
        </Button>
        <Button variant="outline" onClick={() => setRight(true)}>
          Mở panel phải (desktop) / sheet (mobile)
        </Button>
        <Button variant="outline" onClick={() => setBlocking(true)}>
          Dialog bắt buộc chọn (không đóng bằng Esc/nền)
        </Button>
      </Demo>
      <Demo label="Drawer">
        <Button variant="outline" onClick={() => setCart(true)}>
          Mở ngăn bên phải
        </Button>
        <Button variant="outline" onClick={() => setLeft(true)}>
          Mở ngăn bên trái
        </Button>
      </Demo>

      <ResponsiveDialog
        open={center}
        onClose={() => setCenter(false)}
        title="Chọn hình thức nhận hàng"
        description="Bạn muốn nhận hàng theo hình thức nào?"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setCenter(false)}>
              Để sau
            </Button>
            <Button fullWidth onClick={() => setCenter(false)}>
              Xác nhận
            </Button>
          </div>
        }
      >
        <SegmentedControl
          fullWidth
          label="Hình thức nhận hàng"
          value="giao"
          onChange={() => undefined}
          options={[
            { value: "giao", label: "Giao tận nơi" },
            { value: "nhan", label: "Nhận tại cửa hàng" },
          ]}
        />
        <p className="mt-4 text-sm text-muted">
          Nội dung dài cuộn bên trong hộp thoại, tiêu đề và nút ở chân luôn hiện.
        </p>
        <div className="mt-3 space-y-2">
          {Array.from({ length: 12 }, (_, index) => (
            <p key={index} className="rounded-card bg-page-bg p-3 text-sm">
              Dòng nội dung {index + 1}
            </p>
          ))}
        </div>
      </ResponsiveDialog>

      <ResponsiveDialog
        open={right}
        onClose={() => setRight(false)}
        title="Lọc sản phẩm"
        size="sm"
        placement="right"
        footer={
          <Button fullWidth onClick={() => setRight(false)}>
            Xem 120 sản phẩm
          </Button>
        }
      >
        <Checkbox label="Đang giảm giá" />
        <div className="h-3" />
        <Checkbox label="Còn hàng" />
      </ResponsiveDialog>

      <ResponsiveDialog
        open={blocking}
        onClose={() => setBlocking(false)}
        title="Giá đã thay đổi"
        description="Một số sản phẩm đã đổi giá. Bạn xem lại trước khi đặt hàng nhé."
        dismissible={false}
        size="sm"
        footer={
          <Button fullWidth onClick={() => setBlocking(false)}>
            Đã hiểu
          </Button>
        }
      >
        <p className="text-sm text-muted">Hộp thoại này chỉ đóng bằng nút bên dưới.</p>
      </ResponsiveDialog>

      <Drawer
        open={cart}
        onClose={() => setCart(false)}
        title="Giỏ hàng (3)"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setCart(false)}>
              Xem giỏ hàng
            </Button>
            <Button
              fullWidth
              onClick={() => toast.show({ tone: "success", title: "Đã chuyển tới đặt hàng" })}
            >
              Đặt hàng
            </Button>
          </div>
        }
      >
        <EmptyState title="Chưa có sản phẩm" description="Thêm sản phẩm để xem ở đây." />
      </Drawer>

      <Drawer open={left} onClose={() => setLeft(false)} title="Danh mục" side="left">
        <ul className="divide-y divide-border">
          {["Rau củ quả", "Thịt, trứng", "Đồ uống", "Bánh kẹo"].map((name) => (
            <li key={name} className="py-3 text-[15px]">
              {name}
            </li>
          ))}
        </ul>
      </Drawer>
    </Section>
  );
}

function Toasts() {
  const toast = useToast();
  return (
    <Section id="toast" title="Toast">
      <Demo label="Tự đóng sau 4 giây (lỗi 6 giây); rê chuột/focus để tạm dừng; hiện cả trên dialog đang mở">
        <Button
          variant="soft"
          onClick={() => toast.show({ tone: "success", title: "Đã thêm vào giỏ hàng" })}
        >
          Thành công
        </Button>
        <Button
          variant="soft"
          onClick={() =>
            toast.show({
              tone: "error",
              title: "Không thêm được",
              description: "Sản phẩm đã hết hàng.",
            })
          }
        >
          Lỗi
        </Button>
        <Button
          variant="soft"
          onClick={() =>
            toast.show({
              tone: "info",
              title: "Đã xóa khỏi giỏ hàng",
              action: { label: "Hoàn tác", onClick: () => undefined },
            })
          }
        >
          Có nút hành động
        </Button>
        <Button
          variant="soft"
          onClick={() => toast.show({ title: "Không tự đóng", durationMs: 0 })}
        >
          Không tự đóng
        </Button>
      </Demo>
    </Section>
  );
}

function Feedback() {
  return (
    <Section id="feedback" title="Skeleton, EmptyState">
      <Demo
        label="Skeleton của thẻ sản phẩm (cùng kích thước thẻ thật)"
        className="flex flex-wrap gap-4"
      >
        <div className="w-[191px]" aria-busy="true">
          <span className="sr-only">Đang tải sản phẩm</span>
          <Skeleton className="aspect-square w-full" />
          <Skeleton shape="text" className="mt-2 w-full" />
          <Skeleton shape="text" className="mt-1 w-2/3" />
          <Skeleton shape="text" className="mt-2 h-5 w-1/2" />
          <Skeleton shape="rect" className="mt-3 h-10 w-full rounded-pill" />
        </div>
        <Skeleton shape="circle" className="size-16" />
      </Demo>
      <div className="rounded-card border border-border bg-surface">
        <EmptyState
          title="Giỏ hàng của bạn đang trống"
          description="Chọn vài món ngon từ cửa hàng rồi quay lại đây nhé."
          illustration={<Icon name="cart" size={36} />}
          action={<Button>Tiếp tục mua sắm</Button>}
        />
      </div>
    </Section>
  );
}

function Navigation() {
  const [status, setStatus] = useState("tat-ca");
  const [delivery, setDelivery] = useState("giao");
  return (
    <Section id="nav" title="Breadcrumb, Tabs, Accordion, SegmentedControl">
      <Breadcrumb
        items={[
          { label: "Trang chủ", href: "/" },
          { label: "Rau củ quả", href: "/danh-muc/rau-cu-qua" },
          { label: "Cà chua bi VietGAP túi 500g" },
        ]}
      />
      <Demo
        label="Tabs gạch chân (tab trạng thái đơn hàng): mũi tên trái/phải, Home/End; có tab bị khóa"
        className="block"
      >
        <Tabs
          label="Trạng thái đơn hàng"
          value={status}
          onValueChange={setStatus}
          items={[
            { id: "tat-ca", label: "Tất cả" },
            { id: "cho", label: "Chờ thanh toán" },
            { id: "da-tt", label: "Đã thanh toán" },
            { id: "giao", label: "Đang giao" },
            { id: "huy", label: "Đã hủy", disabled: true },
          ]}
        />
      </Demo>
      <Demo label="Tabs dạng ô (bộ sưu tập trang chủ), có panel" className="block">
        <Tabs
          variant="block"
          label="Bộ sưu tập"
          defaultValue="a"
          items={[
            { id: "a", label: "Hàng mới về", panel: <p className="text-sm">Sản phẩm mới về…</p> },
            {
              id: "b",
              label: "Bán chạy trong tuần",
              panel: <p className="text-sm">Sản phẩm bán chạy…</p>,
            },
            { id: "c", label: "Giá sốc", panel: <p className="text-sm">Sản phẩm giá sốc…</p> },
          ]}
        />
      </Demo>
      <Demo label="Accordion (mở một mục, và mở nhiều mục)" className="grid gap-4 md:grid-cols-2">
        <Accordion
          defaultOpenIds={["dau"]}
          items={[
            {
              id: "dau",
              title: "Giao hàng trong bao lâu?",
              content: "Đơn trong bán kính 40km được giao trong ngày.",
            },
            { id: "gia", title: "Phí giao hàng?", content: "Giai đoạn đầu miễn phí giao hàng." },
            { id: "khoa", title: "Mục bị khóa", content: "Không mở được.", disabled: true },
          ]}
        />
        <Accordion
          type="multiple"
          items={[
            { id: "a", title: "Xuất xứ", content: "Việt Nam" },
            { id: "b", title: "Bảo quản", content: "Nơi khô ráo, thoáng mát." },
          ]}
        />
      </Demo>
      <Demo label="SegmentedControl: bình thường · đầy chiều rộng · có lựa chọn bị khóa · cả nhóm bị khóa">
        <SegmentedControl
          label="Hình thức nhận hàng"
          value={delivery}
          onChange={setDelivery}
          options={[
            { value: "giao", label: "Giao tận nơi" },
            { value: "nhan", label: "Nhận tại cửa hàng" },
          ]}
        />
        <SegmentedControl
          label="Khoảng thời gian"
          value="3"
          onChange={() => undefined}
          options={[
            { value: "3", label: "3 tháng" },
            { value: "6", label: "6 tháng", disabled: true },
            { value: "all", label: "Tất cả" },
          ]}
        />
        <SegmentedControl
          label="Nhóm bị khóa"
          value="a"
          disabled
          onChange={() => undefined}
          options={[
            { value: "a", label: "Một" },
            { value: "b", label: "Hai" },
          ]}
        />
      </Demo>
    </Section>
  );
}

function StickyAndLogo() {
  const [qty, setQty] = useState(1);
  return (
    <Section id="sticky" title="StickyActionBar, Logo">
      <Demo
        label="StickyActionBar (trong khung mẫu; ngoài trang thật thì dính đáy màn hình, chỉ hiện < 768px)"
        className="block"
      >
        <div className="relative h-32 overflow-hidden rounded-card border border-border bg-page-bg">
          <StickyActionBar contained showOnDesktop label="Thao tác mua hàng">
            <QuantityStepper label="Cà chua bi" value={qty} onChange={setQty} max={9} />
            <Button fullWidth>Thêm vào giỏ · 17.000đ</Button>
          </StickyActionBar>
        </div>
      </Demo>
      <Demo label="Logo (một component duy nhất, chữ tạm)">
        <span className="rounded-card bg-brand p-4">
          <Logo tone="on-dark" />
        </span>
        <span className="rounded-card border border-border bg-surface p-4">
          <Logo tone="on-light" size="lg" />
        </span>
        <span className="rounded-card border border-border bg-surface p-4">
          <Logo href={null} />
        </span>
      </Demo>
    </Section>
  );
}

function Images() {
  return (
    <Section id="image" title="AppImage">
      <p className="text-sm text-muted">
        Ảnh giữ chỗ cho từng preset (khung đúng tỉ lệ, luôn có width/height). Hàng cuối dùng ảnh “có
        bản” để chạy qua custom loader.
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {IMAGE_PRESET_NAMES.map((name) => (
          <figure key={name} className="flex flex-col gap-2">
            <AppImage
              preset={name}
              alt={`Ảnh giữ chỗ ${name}`}
              className="rounded-card border border-border"
            />
            <figcaption className="text-caption text-muted">
              {name} · {IMAGE_PRESETS[name].widths.join(", ")}px · {IMAGE_PRESETS[name].fit}
            </figcaption>
          </figure>
        ))}
      </div>
      <figure className="flex w-48 flex-col gap-2">
        <AppImage
          preset="product-card"
          image={DEMO_ASSET}
          alt="Ảnh có bản, qua custom loader"
          className="rounded-card border border-border"
        />
        <figcaption className="text-caption text-muted">product-card, có variants</figcaption>
      </figure>
    </Section>
  );
}

export function UiGallery() {
  return (
    <ToastProvider>
      <main className="mx-auto w-full max-w-6xl bg-page-bg px-4 py-6">
        <h1 className="text-page-title">Bộ component giao diện</h1>
        <p className="mt-2 text-sm text-muted">
          Trang này chỉ có khi <code>APP_ENV=local</code>. Rê chuột để xem hover, bấm Tab để xem
          vòng focus, thu cửa sổ dưới 768px để xem bố cục mobile.
        </p>
        <nav aria-label="Mục lục" className="mt-4 flex flex-wrap gap-2">
          {SECTIONS.map(([id, title]) => (
            <a
              key={id}
              href={`#${id}`}
              className="focus-ring rounded-pill bg-surface px-3 py-1 text-sm text-primary hover:bg-primary-soft"
            >
              {title}
            </a>
          ))}
        </nav>
        <ColorsAndType />
        <Buttons />
        <ChipsAndBadges />
        <Prices />
        <Quantities />
        <Forms />
        <Dialogs />
        <Toasts />
        <Feedback />
        <Navigation />
        <StickyAndLogo />
        <Images />
      </main>
    </ToastProvider>
  );
}
