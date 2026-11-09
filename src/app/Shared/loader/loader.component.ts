import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { CommonLoaderService } from '../../services/common-loader.service';
import { AsyncPipe } from '@angular/common';


@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [NgIf, AsyncPipe],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss'
})
export class LoaderComponent {
  constructor(public loader: CommonLoaderService){}

}

