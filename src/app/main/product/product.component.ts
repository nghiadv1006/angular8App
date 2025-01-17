import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Component, OnInit, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup } from "@angular/forms";
import { ModalDirective } from "ngx-bootstrap";
import { MessageContstants } from "src/app/core/common/message.constants";
import { AuthenService } from "src/app/core/services/authen.service";
import { DataService } from "src/app/core/services/data.service";
import { NotificationService } from "src/app/core/services/notification.service";
import { UploadService } from "src/app/core/services/upload.service";
import { UtilityService } from "src/app/core/services/utility.service";
import { environment } from "src/environments/environment";

@Component({
  selector: "app-product",
  templateUrl: "./product.component.html",
  styleUrls: ["./product.component.css"],
})
export class ProductComponent implements OnInit {
  /*Declare modal */
  @ViewChild("addEditModal", { static: false })
  public addEditModal: ModalDirective;
  @ViewChild("thumbnailImage", { static: false }) thumbnailImage;
  public baseFolder: string = environment.BASE_API;
  public entity: any;
  public totalRow: number;
  public pageIndex = 1;
  public pageSize = 20;
  public pageDisplay = 10;
  public filterKeyword = "";
  public filterCategoryID: number;
  public products: any[];
  public productCategories: any[];
  public checkedItems: any[];
  public formUpload: FormGroup;
  private headers = new HttpHeaders();

  /*Product manage */
  public imageEntity: any = {};
  public productImages: any = [];
  @ViewChild("imageManageModal", { static: false })
  public imageManageModal: ModalDirective;
  @ViewChild("imagePath", { static: false }) imagePath;
  public sizeId: number = null;
  public colorId: number = null;
  public colors: any[];
  public sizes: any[];

  /*Quantity manage */
  @ViewChild("quantityManageModal", { static: false })
  public quantityManageModal: ModalDirective;
  public quantityEntity: any = {};
  public productQuantities: any = [];

  constructor(
    public _authenService: AuthenService,
    private _dataService: DataService,
    private notificationService: NotificationService,
    private utilityService: UtilityService,
    private uploadService: UploadService,
    public fb: FormBuilder,
    private http: HttpClient
  ) {
    if (_authenService.checkAccess("USER") == false) {
      utilityService.navigateToLogin();
    }
    this.headers = this.headers.set(
      "Authorization",
      "Bearer " + _authenService.getLoggedInUser().access_token
    );
    this.formUpload = this.fb.group({
      thumbnailImage: [null],
      imagePath: [null],
    });
  }
  ngOnInit() {
    this.search();
    this.loadProductCategories();
  }
  public createAlias() {
    this.entity.Alias = this.utilityService.MakeSeoTitle(this.entity.Name);
  }
  public search() {
    this._dataService
      .get(
        "/api/product/getall?page=" +
          this.pageIndex +
          "&pageSize=" +
          this.pageSize +
          "&keyword=" +
          this.filterKeyword +
          "&categoryId=" +
          this.filterCategoryID
      )
      .subscribe(
        (response: any) => {
          this.products = response.Items;
          this.pageIndex = response.PageIndex;
        },
        (error) => this._dataService.handleError(error)
      );
  }
  public reset() {
    this.filterKeyword = "";
    this.filterCategoryID = null;
    this.search();
  }
  // Show add form
  public showAdd() {
    this.entity = { Content: "" };
    this.addEditModal.show();
  }
  // Show edit form
  public showEdit(id: string) {
    this._dataService.get("/api/product/detail/" + id).subscribe(
      (response: any) => {
        this.entity = response;
        this.addEditModal.show();
      },
      (error) => this._dataService.handleError(error)
    );
  }

  public delete(id: string) {
    if (confirm(MessageContstants.CONFIRM_DELETE_MSG)) {
      this._dataService
        .delete("/api/product/delete", "id", id)
        .subscribe((response: Response) => {
          this.notificationService.printSuccessMessage(
            MessageContstants.DELETED_OK_MSG
          );
          this.search();
        });
    }
  }

  private loadProductCategories() {
    this._dataService.get("/api/productCategory/getallhierachy").subscribe(
      (response: any[]) => {
        this.productCategories = response;
      },
      (error) => this._dataService.handleError(error)
    );
  }

  uploadFile1(event) {
    const file = (event.target as HTMLInputElement).files[0];
    this.formUpload.patchValue({
      thumbnailImage: file,
    });
    this.formUpload.get("thumbnailImage").updateValueAndValidity();
    console.log(this.formUpload.value);
  }
  // Save change for modal popup
  public saveChanges(valid: boolean) {
    if (valid) {
      const fi = this.thumbnailImage.nativeElement;
      if (fi.files.length > 0) {
        // this.uploadService.postWithFile('/api/upload/saveImage?type=product', null, fi.files).then((imageUrl: string) => {
        //   this.entity.ThumbnailImage = imageUrl;
        // }).then(() => {
        //   this.saveData();
        // });
        var formData: any = new FormData();
        formData.append(
          "thumbnailImage",
          this.formUpload.get("thumbnailImage").value
        );

        this.http
          .post(
            this.baseFolder + "/api/upload/saveImage?type=product",
            formData,
            { headers: this.headers }
          )
          .subscribe(
            (response) => {
              console.log(response);
              this.entity.ThumbnailImage = response;
              this.saveData();
            },
            (error) => console.log(error)
          );
      } else {
        this.saveData();
      }
    }
  }
  private saveData() {
    if (this.entity.ID === undefined) {
      this._dataService
        .post("/api/product/add", JSON.stringify(this.entity))
        .subscribe((response: any) => {
          this.search();
          this.addEditModal.hide();
          this.notificationService.printSuccessMessage(
            MessageContstants.CREATED_OK_MSG
          );
        });
    } else {
      this._dataService
        .put("/api/product/update", JSON.stringify(this.entity))
        .subscribe(
          (response: any) => {
            this.search();
            this.addEditModal.hide();
            this.notificationService.printSuccessMessage(
              MessageContstants.UPDATED_OK_MSG
            );
          },
          (error) => this._dataService.handleError(error)
        );
    }
  }
  public pageChanged(event: any): void {
    this.pageIndex = event.page;
    this.search();
  }

  public keyupHandlerContentFunction(e: any) {
    this.entity.Content = e;
  }

  public deleteMulti() {
    this.checkedItems = this.products.filter((x) => x.Checked);
    const checkedIds = [];
    for (let i = 0; i < this.checkedItems.length; ++i) {
      checkedIds.push(this.checkedItems[i]["ID"]);
    }
    if (confirm(MessageContstants.CONFIRM_DELETE_MSG)) {
      this._dataService
        .delete(
          "/api/product/deletemulti",
          "checkedProducts",
          JSON.stringify(checkedIds)
        )
        .subscribe((response: any) => {
          this.notificationService.printSuccessMessage(
            MessageContstants.DELETED_OK_MSG
          );
          this.search();
        });
    }
  }

  /*Image management*/
  public showImageManage(id: number) {
    this.imageEntity = {
      ProductId: id,
    };
    this.loadProductImages(id);
    this.imageManageModal.show();
  }

  public loadProductImages(id: number) {
    this._dataService.get("/api/productImage/getall?productId=" + id).subscribe(
      (response: any[]) => {
        this.productImages = response;
      },
      (error) => this._dataService.handleError(error)
    );
  }
  public deleteImage(id: number) {
    if (confirm(MessageContstants.CONFIRM_DELETE_MSG)) {
      this._dataService
        .delete("/api/productImage/delete", "id", id.toString())
        .subscribe(
          (response: any) => {
            this.notificationService.printSuccessMessage(
              MessageContstants.DELETED_OK_MSG
            );
            this.loadProductImages(this.imageEntity.ProductId);
          },
          (error) => this._dataService.handleError(error)
        );
    }
  }
  uploadFile2(event) {
    const file = (event.target as HTMLInputElement).files[0];
    this.formUpload.patchValue({
      imagePath: file,
    });
    this.formUpload.get("imagePath").updateValueAndValidity();
    console.log(this.formUpload.value);
  }

  public saveProductImage(isValid: boolean) {
    if (isValid) {
      const fi = this.imagePath.nativeElement;
      if (fi.files.length > 0) {
        var formData: any = new FormData();
        formData.append("imagePath", this.formUpload.get("imagePath").value);

        this.http
          .post(
            this.baseFolder + "/api/upload/saveImage?type=product",
            formData,
            { headers: this.headers }
          )
          .subscribe(
            (response) => {
              console.log(response);
              // this.entity.ThumbnailImage = response;
              this.imageEntity.Path = response;
              this._dataService
                .post("/api/productImage/add", JSON.stringify(this.imageEntity))
                .subscribe((response: any) => {
                  this.loadProductImages(this.imageEntity.ProductId);
                  this.notificationService.printSuccessMessage(
                    MessageContstants.CREATED_OK_MSG
                  );
                });
            },
            (error) => console.log(error)
          );

        // this.uploadService.postWithFile('/api/upload/saveImage?type=product', null, fi.files).then((imageUrl: string) => {
        //   this.imageEntity.Path = imageUrl;
        //   this._dataService.post('/api/productImage/add', JSON.stringify(this.imageEntity)).subscribe((response: any) => {
        //     this.loadProductImages(this.imageEntity.ProductId);
        //     this.notificationService.printSuccessMessage(MessageContstants.CREATED_OK_MSG);
        //   });
        // });
      }
    }
  }

  /*Quản lý số lượng */
  public showQuantityManage(id: number) {
    this.quantityEntity = {
      ProductId: id,
    };
    this.loadColors();
    this.loadSizes();
    this.loadProductQuantities(id);
    this.quantityManageModal.show();
  }
  public loadColors() {
    this._dataService.get("/api/productQuantity/getcolors").subscribe(
      (response: any[]) => {
        this.colors = response;
      },
      (error) => this._dataService.handleError(error)
    );
  }
  public loadSizes() {
    this._dataService.get("/api/productQuantity/getsizes").subscribe(
      (response: any[]) => {
        this.sizes = response;
      },
      (error) => this._dataService.handleError(error)
    );
  }

  public loadProductQuantities(id: number) {
    this._dataService
      .get(
        "/api/productQuantity/getall?productId=" +
          id +
          "&sizeId=" +
          this.sizeId +
          "&colorId=" +
          this.colorId
      )
      .subscribe(
        (response: any[]) => {
          this.productQuantities = response;
        },
        (error) => this._dataService.handleError(error)
      );
  }

  public saveProductQuantity(isValid: boolean) {
    if (isValid) {
      this._dataService
        .post("/api/productQuantity/add", JSON.stringify(this.quantityEntity))
        .subscribe(
          (response: any) => {
            this.loadProductQuantities(this.quantityEntity.ProductId);
            this.quantityEntity = {
              ProductId: this.quantityEntity.ProductId,
            };
            this.notificationService.printSuccessMessage(
              MessageContstants.CREATED_OK_MSG
            );
          },
          (error) => this._dataService.handleError(error)
        );
    }
  }

  public deleteQuantity(productId: number, colorId: string, sizeId: string) {
    const parameters = {
      productId: productId,
      sizeId: sizeId,
      colorId: colorId,
    };

    if (confirm(MessageContstants.CONFIRM_DELETE_MSG)) {
      this._dataService
        .deleteWithMultiParams("/api/productQuantity/delete", parameters)
        .subscribe(
          (response: any) => {
            this.notificationService.printSuccessMessage(
              MessageContstants.DELETED_OK_MSG
            );
            this.loadProductQuantities(productId);
          },
          (error) => this._dataService.handleError(error)
        );
    }
  }
}
