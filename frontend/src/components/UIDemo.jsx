import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Home, 
  Users, 
  Settings, 
  Bell, 
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

const UIDemo = () => {
  return (
    <div className="space-y-8 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">UI Components Demo</h1>
        <p className="text-gray-600">Các component Shadcn/ui đã được tích hợp</p>
      </div>

      {/* Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Cards</CardTitle>
          <CardDescription>
            Các loại card khác nhau cho layout
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Nội dung card cơ bản</p>
              </CardContent>
            </Card>
            
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg text-blue-900">Highlighted Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-700">Card với màu nổi bật</p>
              </CardContent>
            </Card>
            
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg text-green-900">Success Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-700">Card thành công</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>
            Các loại button khác nhau
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button>Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="destructive">Destructive Button</Button>
            <Button size="sm">Small Button</Button>
            <Button size="lg">Large Button</Button>
            <Button disabled>Disabled Button</Button>
          </div>
        </CardContent>
      </Card>

      {/* Form Elements */}
      <Card>
        <CardHeader>
          <CardTitle>Form Elements</CardTitle>
          <CardDescription>
            Các thành phần form
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Input Field</label>
              <Input placeholder="Nhập văn bản..." />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Dropdown</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tùy chọn..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Tùy chọn 1</SelectItem>
                  <SelectItem value="option2">Tùy chọn 2</SelectItem>
                  <SelectItem value="option3">Tùy chọn 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Badges</CardTitle>
          <CardDescription>
            Các loại badge khác nhau
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Avatars */}
      <Card>
        <CardHeader>
          <CardTitle>Avatars</CardTitle>
          <CardDescription>
            Các loại avatar khác nhau
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar className="w-12 h-12">
              <AvatarFallback>CD</AvatarFallback>
            </Avatar>
          </div>
        </CardContent>
      </Card>

      {/* Icons */}
      <Card>
        <CardHeader>
          <CardTitle>Icons</CardTitle>
          <CardDescription>
            Lucide React icons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Home className="w-5 h-5 text-blue-600" />
              <span className="text-sm">Home</span>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
              <span className="text-sm">Users</span>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Settings className="w-5 h-5 text-gray-600" />
              <span className="text-sm">Settings</span>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Bell className="w-5 h-5 text-yellow-600" />
              <span className="text-sm">Notifications</span>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Search className="w-5 h-5 text-purple-600" />
              <span className="text-sm">Search</span>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Plus className="w-5 h-5 text-indigo-600" />
              <span className="text-sm">Add</span>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Edit className="w-5 h-5 text-orange-600" />
              <span className="text-sm">Edit</span>
            </div>
            <div className="flex items-center space-x-2 p-3 border rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span className="text-sm">Delete</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Status Indicators</CardTitle>
          <CardDescription>
            Các chỉ báo trạng thái
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm">Success</span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm">Error</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm">Warning</span>
              </div>
              <div className="flex items-center space-x-2">
                <Info className="w-5 h-5 text-blue-600" />
                <span className="text-sm">Info</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Layout Example */}
      <Card>
        <CardHeader>
          <CardTitle>Layout Example</CardTitle>
          <CardDescription>
            Ví dụ layout sử dụng các component
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Tổng học sinh</CardTitle>
                    <CardDescription>150 học sinh</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Badge variant="success">+5%</Badge>
                  <span className="text-2xl font-bold text-gray-900">150</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Có mặt</CardTitle>
                    <CardDescription>Hôm nay</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Badge variant="success">94%</Badge>
                  <span className="text-2xl font-bold text-gray-900">142</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Vắng mặt</CardTitle>
                    <CardDescription>Hôm nay</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <Badge variant="destructive">6%</Badge>
                  <span className="text-2xl font-bold text-gray-900">8</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UIDemo;
